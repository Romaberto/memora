/**
 * Monte Carlo — tier profitability under plausible usage distributions.
 *
 * We want to answer: at each candidate price point, what's our margin once
 * we pay for OpenAI generation, Stripe fees, and a per-user infra slice?
 * The number of quizzes a user actually generates is the main unknown, so
 * we sample it from a log-normal distribution fit to each tier's persona.
 *
 * Run: `npx tsx scripts/pricing-monte-carlo.ts`
 *
 * No Prisma imports — pure simulation. Safe to run in CI or locally without
 * hitting the DB.
 */

// ── Cost model ──────────────────────────────────────────────────────────────
//
// OpenAI gpt-4.1-mini (public list, Apr 2026):
//   Input:  $0.40 / 1M tokens
//   Output: $1.60 / 1M tokens
//
// Empirically (from our prompts in src/lib/quiz-generator.ts):
//   Input  ≈ 1500 tokens (system prompt + user content excerpt)
//   Output ≈ 100 tokens per question (question + 4 options + explanation)
//
// We treat input as a fixed cost per call and output as linear in question
// count. This understates input cost when users paste very long source
// material, but at our question caps the output dominates so it's close.
const INPUT_PRICE_PER_1M = 0.4;
const OUTPUT_PRICE_PER_1M = 1.6;
const INPUT_TOKENS_PER_QUIZ = 1500;
const OUTPUT_TOKENS_PER_QUESTION = 100;

function openaiCostPerQuiz(questions: number): number {
  const input = (INPUT_TOKENS_PER_QUIZ * INPUT_PRICE_PER_1M) / 1_000_000;
  const output =
    (questions * OUTPUT_TOKENS_PER_QUESTION * OUTPUT_PRICE_PER_1M) / 1_000_000;
  return input + output;
}

// Stripe: 2.9% + $0.30 per successful charge, once per month per subscriber.
function stripeFee(price: number): number {
  if (price === 0) return 0;
  return price * 0.029 + 0.3;
}

// Per-user infra slice: DB rows, bandwidth, logs, Vercel compute. Rough.
const INFRA_PER_USER_PER_MONTH = 0.25;

// ── Usage model ─────────────────────────────────────────────────────────────
//
// Quizzes-per-month is log-normal (most users light, a long tail of power
// users). Parameters (mu, sigma) are picked so the median and 95th pct line
// up with the personas we expect to subscribe at each tier.
//
// The daily cap clips the monthly ceiling; effective monthly max ≈ 30 × cap.
// Master is uncapped → no clip.
type TierPersona = {
  label: string;
  priceMonthly: number;
  maxQuestions: number;
  dailyCap: number | null;
  // log-normal params for monthly generations
  mu: number;
  sigma: number;
  // distribution of chosen question lengths within this tier
  // (rungs from 10..maxQuestions; must sum to 1)
  qMix: Array<{ n: number; p: number }>;
};

const TIERS_TO_SIM: TierPersona[] = [
  {
    label: "Builder  $9/mo",
    priceMonthly: 9,
    maxQuestions: 20,
    dailyCap: 5,
    // median ~30 quizzes/mo, 95th pct ~130 (hits cap ~150)
    mu: Math.log(30),
    sigma: 0.9,
    qMix: [
      { n: 10, p: 0.6 },
      { n: 20, p: 0.4 },
    ],
  },
  {
    label: "Scholar  $14/mo",
    priceMonthly: 14,
    maxQuestions: 30,
    dailyCap: 15,
    // median ~60/mo, 95th pct ~290 (cap ~450)
    mu: Math.log(60),
    sigma: 1.0,
    qMix: [
      { n: 10, p: 0.35 },
      { n: 20, p: 0.4 },
      { n: 30, p: 0.25 },
    ],
  },
  {
    label: "Master   $24/mo",
    priceMonthly: 24,
    maxQuestions: 50,
    dailyCap: null,
    // median ~120/mo, 95th pct ~700, no cap — power users
    mu: Math.log(120),
    sigma: 1.1,
    qMix: [
      { n: 10, p: 0.15 },
      { n: 20, p: 0.25 },
      { n: 30, p: 0.3 },
      { n: 40, p: 0.15 },
      { n: 50, p: 0.15 },
    ],
  },
];

// Box–Muller → standard normal
function randn(): number {
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleLogNormal(mu: number, sigma: number): number {
  return Math.exp(mu + sigma * randn());
}

function sampleQuestionCount(mix: TierPersona["qMix"]): number {
  const r = Math.random();
  let acc = 0;
  for (const opt of mix) {
    acc += opt.p;
    if (r <= acc) return opt.n;
  }
  return mix[mix.length - 1]!.n;
}

// ── Simulation ──────────────────────────────────────────────────────────────

const N = 50_000;

type Result = {
  label: string;
  price: number;
  meanQuizzes: number;
  p50Quizzes: number;
  p95Quizzes: number;
  meanOpenaiCost: number;
  p95OpenaiCost: number;
  stripeFee: number;
  infraCost: number;
  meanMargin: number;
  p5Margin: number;
  marginPct: number;
  breakEvenQuizzes: number; // where a SINGLE user turns unprofitable
  lossRate: number; // fraction of users where we lose money
};

function simulate(tier: TierPersona): Result {
  const monthlyCap = tier.dailyCap == null ? Infinity : tier.dailyCap * 30;
  const quizzesSamples: number[] = [];
  const costSamples: number[] = [];
  const marginSamples: number[] = [];
  let losses = 0;
  const net = tier.priceMonthly - stripeFee(tier.priceMonthly) - INFRA_PER_USER_PER_MONTH;

  for (let i = 0; i < N; i++) {
    const raw = sampleLogNormal(tier.mu, tier.sigma);
    const quizzes = Math.floor(Math.min(raw, monthlyCap));
    let openaiCost = 0;
    for (let j = 0; j < quizzes; j++) {
      const q = sampleQuestionCount(tier.qMix);
      openaiCost += openaiCostPerQuiz(q);
    }
    const margin = net - openaiCost;
    if (margin < 0) losses++;
    quizzesSamples.push(quizzes);
    costSamples.push(openaiCost);
    marginSamples.push(margin);
  }

  quizzesSamples.sort((a, b) => a - b);
  costSamples.sort((a, b) => a - b);
  marginSamples.sort((a, b) => a - b);
  const pct = (arr: number[], p: number) => arr[Math.floor(arr.length * p)]!;
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  // Average cost-per-quiz across this tier's qMix
  const avgQuestions = tier.qMix.reduce((a, o) => a + o.n * o.p, 0);
  const avgCostPerQuiz = openaiCostPerQuiz(avgQuestions);
  const breakEven = Math.floor(net / avgCostPerQuiz);

  const meanMargin = mean(marginSamples);
  return {
    label: tier.label,
    price: tier.priceMonthly,
    meanQuizzes: mean(quizzesSamples),
    p50Quizzes: pct(quizzesSamples, 0.5),
    p95Quizzes: pct(quizzesSamples, 0.95),
    meanOpenaiCost: mean(costSamples),
    p95OpenaiCost: pct(costSamples, 0.95),
    stripeFee: stripeFee(tier.priceMonthly),
    infraCost: INFRA_PER_USER_PER_MONTH,
    meanMargin,
    p5Margin: pct(marginSamples, 0.05),
    marginPct: (meanMargin / tier.priceMonthly) * 100,
    breakEvenQuizzes: breakEven,
    lossRate: losses / N,
  };
}

// ── Report ──────────────────────────────────────────────────────────────────

console.log("\n=== Memora — Tier profitability Monte Carlo ===");
console.log(`N = ${N.toLocaleString()} synthetic users per tier`);
console.log(`Model: gpt-4.1-mini @ $${INPUT_PRICE_PER_1M}/1M in, $${OUTPUT_PRICE_PER_1M}/1M out`);
console.log(
  `Assumed: ${INPUT_TOKENS_PER_QUIZ} input + ${OUTPUT_TOKENS_PER_QUESTION}/question output tokens`,
);
console.log(`Stripe: 2.9% + $0.30 · Infra: $${INFRA_PER_USER_PER_MONTH}/user/mo\n`);

console.log("Per-quiz OpenAI cost by length:");
for (const q of [10, 20, 30, 40, 50]) {
  console.log(`  ${q}Q → $${openaiCostPerQuiz(q).toFixed(4)}`);
}
console.log();

const results = TIERS_TO_SIM.map(simulate);

console.log(
  "Tier             | Price  | p50 Q  | p95 Q  | avg Q  | avg cost | net    | margin$ | margin% | break-even | loss rate",
);
console.log(
  "-----------------+--------+--------+--------+--------+----------+--------+---------+---------+------------+----------",
);
for (const r of results) {
  const net = r.price - r.stripeFee - r.infraCost;
  console.log(
    `${r.label.padEnd(17)}| $${r.price.toString().padStart(3)}   | ${r.p50Quizzes.toString().padStart(4)}   | ${r.p95Quizzes.toString().padStart(4)}   | ${r.meanQuizzes.toFixed(0).padStart(4)}   | $${r.meanOpenaiCost.toFixed(3).padStart(6)}  | $${net.toFixed(2).padStart(5)} | $${r.meanMargin.toFixed(2).padStart(6)} | ${r.marginPct.toFixed(1).padStart(5)}% | ${r.breakEvenQuizzes.toString().padStart(6)}/mo | ${(r.lossRate * 100).toFixed(2)}%`,
  );
}

console.log("\nInterpretation");
console.log("──────────────");
for (const r of results) {
  const comfortableMultiple = r.breakEvenQuizzes / Math.max(r.p95Quizzes, 1);
  console.log(
    `• ${r.label}: break-even at ${r.breakEvenQuizzes} quizzes/mo; even the p95 user only does ${r.p95Quizzes}. Headroom ≈ ${comfortableMultiple.toFixed(1)}×. Expected margin ${r.marginPct.toFixed(0)}%.`,
  );
}

// ── Sensitivity: what if a "whale" user goes nuts? ──────────────────────────
console.log("\nWorst-case stress test (adversarial Master user, maxing daily limits):");
const masterPrice = 24;
const masterNet = masterPrice - stripeFee(masterPrice) - INFRA_PER_USER_PER_MONTH;
for (const daily of [10, 20, 30, 50]) {
  const monthly = daily * 30;
  const cost = monthly * openaiCostPerQuiz(50);
  const margin = masterNet - cost;
  console.log(
    `  ${daily} × 50Q quizzes/day for 30 days = ${monthly} quizzes · cost $${cost.toFixed(2)} · margin $${margin.toFixed(2)}`,
  );
}
