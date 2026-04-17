/**
 * Subscription tier configuration — single source of truth.
 *
 * Every product-level limit (daily quiz quota, max questions per quiz,
 * whether custom generation is unlocked) is derived from this file.
 * `lib/subscription.ts` is the runtime adapter; the pricing page, admin
 * panel, upgrade modal, and dashboard all read the same constants so
 * there is exactly one place to edit when a tier changes.
 *
 * Design rationale
 * ────────────────
 * - 4 tiers, anchored so Scholar ($14) wins the center-stage vote by default.
 *   The jumps are deliberately asymmetric — Builder→Scholar is +$5 (easy),
 *   Scholar→Master is +$10 (friction). That's Ariely's decoy move: the
 *   painful upper step pushes buyers to the middle. See `scripts/pricing-
 *   monte-carlo.ts` for the margin modeling that backs these numbers.
 * - Charm pricing: $9 / $14 / $24. Each sits just below a round bucket,
 *   so left-digit reads as $9/$14/$24 rather than "ten/fifteen/twenty-five".
 * - Master at $24 intentionally crosses the ChatGPT-Plus $20 anchor. Signals
 *   premium via price-quality heuristic; simulation shows COGS supports it
 *   with ~90% gross margin even for p95 power users (see script output).
 * - Free tier has zero OpenAI cost. Pre-made quizzes only. This is what lets
 *   F2P grow without lighting money on fire.
 * - Clear feature escalation, not just "more of the same number". Each
 *   step unlocks a meaningful capability: custom → more questions → no cap.
 */

export const TIER_IDS = ["free", "builder", "scholar", "master"] as const;
export type TierId = (typeof TIER_IDS)[number];

export type Tier = {
  id: TierId;
  name: string;
  /** One-line elevator pitch shown on /pricing and in the upgrade modal. */
  tagline: string;
  /** Monthly price in USD. Annual is derived (2 months free → ×10). */
  priceMonthly: number;
  /** Can this tier create custom quizzes via /api/generate-quiz? */
  canCustomQuiz: boolean;
  /** Max questions per custom quiz. N/A for free tier. */
  maxQuestionsPerQuiz: number;
  /** Daily custom-quiz cap. `null` = unlimited. Pre-made quizzes are never capped. */
  dailyQuizLimit: number | null;
  /** How many pre-made quizzes are unlocked per topic. `null` = full library. */
  premadeQuizLimitPerTopic: number | null;
  /** How much progress history the dashboard can chart. */
  progressHistoryDays: number;
  /** Feature bullets for the pricing card. Ordered; first bullet is the headline. */
  features: string[];
  /** Visual treatment on /pricing. One tier is `highlight`. */
  highlight?: boolean;
};

export const TIERS: Record<TierId, Tier> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Sample every topic for free.",
    priceMonthly: 0,
    canCustomQuiz: false,
    maxQuestionsPerQuiz: 0,
    dailyQuizLimit: 0,
    premadeQuizLimitPerTopic: 1,
    progressHistoryDays: 7,
    features: [
      "Try every topic with one pre-made quiz",
      "25 pre-made quizzes total",
      "7-day progress chart",
      "Leaderboard and streak tracking",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    tagline: "Turn your own notes into quizzes.",
    priceMonthly: 9,
    canCustomQuiz: true,
    maxQuestionsPerQuiz: 20,
    dailyQuizLimit: 3,
    premadeQuizLimitPerTopic: 2,
    progressHistoryDays: 30,
    features: [
      "Custom quizzes from your own content",
      "50 pre-made quizzes across 25 topics",
      "3 custom quizzes per day",
      "30-day progress chart",
      "Up to 20 questions per quiz",
      "2 quizzes unlocked in each topic",
    ],
  },
  scholar: {
    id: "scholar",
    name: "Scholar",
    tagline: "Unlock the full study flow.",
    priceMonthly: 14,
    canCustomQuiz: true,
    maxQuestionsPerQuiz: 30,
    dailyQuizLimit: 15,
    premadeQuizLimitPerTopic: null,
    progressHistoryDays: 120,
    features: [
      "Full pre-made quiz library",
      "15 custom quizzes per day",
      "120-day progress chart",
      "Priority quiz generation",
      "Up to 30 questions per quiz",
      "Custom quizzes from your own content",
    ],
    highlight: true,
  },
  master: {
    id: "master",
    name: "Master",
    tagline: "Unlimited practice, full-year history.",
    priceMonthly: 24,
    canCustomQuiz: true,
    maxQuestionsPerQuiz: 50,
    dailyQuizLimit: null,
    premadeQuizLimitPerTopic: null,
    progressHistoryDays: 365,
    features: [
      "Unlimited custom quizzes",
      "1-year progress chart",
      "Up to 50 questions per quiz",
      "Early access to new features",
      "Everything in Scholar",
    ],
  },
};

/** All tiers in display order. Pricing page + admin dropdown iterate this. */
export const TIERS_IN_ORDER: Tier[] = TIER_IDS.map((id) => TIERS[id]);

/** Paid tiers, for iteration in upgrade-flow UIs that skip free. */
export const PAID_TIERS: Tier[] = TIERS_IN_ORDER.filter((t) => t.priceMonthly > 0);

/** Narrow any string to a known tier id, defaulting to free. */
export function normalizeTierId(raw: string | null | undefined): TierId {
  if (!raw) return "free";
  return (TIER_IDS as readonly string[]).includes(raw) ? (raw as TierId) : "free";
}

export function getTier(id: string | null | undefined): Tier {
  return TIERS[normalizeTierId(id)];
}

export function getPremadeQuizLimitForTier(id: string | null | undefined): number | null {
  return getTier(id).premadeQuizLimitPerTopic;
}

export function getProgressHistoryDaysForTier(id: string | null | undefined): number {
  return getTier(id).progressHistoryDays;
}

/** Question-count options the UI should expose for this tier. */
export function getAllowedQuestionCountsForTier(id: TierId): number[] {
  const tier = TIERS[id];
  if (!tier.canCustomQuiz) return [];
  // Fixed rungs — 10/20/30/40/50 — filtered by tier ceiling. Matches the
  // existing QUESTION_COUNTS array in lib/schemas/quiz.ts.
  return [10, 20, 30, 40, 50].filter((n) => n <= tier.maxQuestionsPerQuiz);
}

export function isQuestionCountAllowedForTier(id: TierId, count: number): boolean {
  return getAllowedQuestionCountsForTier(id).includes(count);
}

/** Annual price with 2 months free (×10). Used by the pricing toggle. */
export function getAnnualPrice(tier: Tier): number {
  return tier.priceMonthly * 10;
}

/**
 * Suggested upgrade target for a user who just hit a limit.
 * `reason` changes which tier we recommend:
 *   - "custom_quiz"  → Builder (cheapest paid tier that unlocks generation)
 *   - "question_count" / "daily_limit" → next tier up from the user's current
 */
export function suggestUpgrade(
  currentTierId: TierId,
  reason: "custom_quiz" | "question_count" | "daily_limit",
): Tier {
  if (reason === "custom_quiz") return TIERS.builder;
  const currentIdx = TIER_IDS.indexOf(currentTierId);
  const nextIdx = Math.min(currentIdx + 1, TIER_IDS.length - 1);
  return TIERS[TIER_IDS[nextIdx]!];
}
