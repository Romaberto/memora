import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import prisma from "../src/lib/db";
import { createAIClient, type AIClient, type ChatCompletionArgs } from "../src/lib/ai";
import { generateQuizPayload } from "../src/lib/quiz-generator";
import { createQuizRequestWithQuota } from "../src/lib/subscription";
import { QUESTION_COUNTS, type QuestionCount } from "../src/lib/schemas/quiz";

type Mode = "stub" | "openai";

type Options = {
  preset: "single" | "persist-ramp" | "openai-smoke";
  users: number;
  concurrency: number;
  requestsPerUser: number;
  questionCount: QuestionCount;
  mode: Mode;
  persist: boolean;
  cleanup: boolean;
  stubAiMs: number;
  stubAiJitterMs: number;
  allowExpensive: boolean;
  outputJson: string | null;
};

type LoadUser = {
  id: string;
  email: string;
};

type TaskResult = {
  ok: boolean;
  durationMs: number;
  usedFallback: boolean;
  questionCount: number;
  error?: string;
};

const DEFAULTS: Options = {
  preset: "single",
  users: 100,
  concurrency: 25,
  requestsPerUser: 1,
  questionCount: 20,
  mode: "stub",
  persist: true,
  cleanup: true,
  stubAiMs: 1200,
  stubAiJitterMs: 400,
  allowExpensive: false,
  outputJson: null,
};

type RunSummary = {
  label: string;
  options: Options;
  totalRequests: number;
  successes: number;
  failures: number;
  fallbackCount: number;
  wallTimeMs: number;
  throughputReqPerSecond: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  latencyMaxMs: number;
  failureBreakdown: Record<string, number>;
};

class StubAIClient implements AIClient {
  constructor(
    private readonly questionCount: QuestionCount,
    private readonly baseDelayMs: number,
    private readonly jitterMs: number,
  ) {}

  async completeJson(_args: ChatCompletionArgs): Promise<string> {
    const sleepMs = this.baseDelayMs + Math.floor(Math.random() * (this.jitterMs + 1));
    if (sleepMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }

    const angles = [
      "definition",
      "mechanism",
      "comparison",
      "example",
      "misconception",
      "cause and effect",
      "tradeoff",
      "application",
      "sequence",
      "implication",
    ];
    const subjects = [
      "retrieval practice",
      "spacing",
      "feedback loops",
      "memory consolidation",
      "study planning",
      "interleaving",
      "self-testing",
      "error correction",
      "knowledge transfer",
      "review cadence",
    ];

    return JSON.stringify({
      topic: "Load test topic",
      questions: Array.from({ length: this.questionCount }, (_, index) => {
        const uniqueA = `alpha${index + 1}`;
        const uniqueB = `vector${index + 1}`;
        const subject = subjects[index % subjects.length];
        const angle = angles[index % angles.length];
        return {
          id: randomUUID(),
          question: `In study case ${uniqueA}, which ${angle} best explains ${subject} when the learner faces ${uniqueB}?`,
          options: [
            `Correct explanation for ${subject} in ${uniqueA}`,
            `Plausible distractor about ${subjects[(index + 1) % subjects.length]} in ${uniqueB}`,
            `Alternative distractor about ${subjects[(index + 2) % subjects.length]} during ${uniqueA}`,
            `Incorrect tradeoff for ${subjects[(index + 3) % subjects.length]} under ${uniqueB}`,
          ],
          correctIndex: 0,
          explanation: `Explanation ${index + 1} reinforces the ${angle} behind ${subject} for scenario ${uniqueA}.`,
        };
      }),
    });
  }
}

function parseArgs(argv: string[]): Options {
  const out = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--preset" && next) {
      if (next !== "single" && next !== "persist-ramp" && next !== "openai-smoke") {
        throw new Error(`--preset must be single, persist-ramp, or openai-smoke`);
      }
      out.preset = next;
    }
    if (arg === "--users" && next) out.users = toPositiveInt(next, "--users");
    if (arg === "--concurrency" && next) out.concurrency = toPositiveInt(next, "--concurrency");
    if (arg === "--requests-per-user" && next) {
      out.requestsPerUser = toPositiveInt(next, "--requests-per-user");
    }
    if (arg === "--question-count" && next) {
      out.questionCount = toQuestionCount(next);
    }
    if (arg === "--mode" && next) {
      if (next !== "stub" && next !== "openai") {
        throw new Error(`--mode must be "stub" or "openai", got "${next}"`);
      }
      out.mode = next;
    }
    if (arg === "--stub-ai-ms" && next) out.stubAiMs = toNonNegativeInt(next, "--stub-ai-ms");
    if (arg === "--stub-ai-jitter-ms" && next) {
      out.stubAiJitterMs = toNonNegativeInt(next, "--stub-ai-jitter-ms");
    }
    if (arg === "--output-json" && next) out.outputJson = next;
    if (arg === "--no-persist") out.persist = false;
    if (arg === "--no-cleanup") out.cleanup = false;
    if (arg === "--allow-expensive") out.allowExpensive = true;
  }

  if (out.concurrency > out.users * out.requestsPerUser) {
    out.concurrency = out.users * out.requestsPerUser;
  }

  return out;
}

function toPositiveInt(value: string, flag: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} must be a positive integer`);
  return n;
}

function toNonNegativeInt(value: string, flag: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${flag} must be a non-negative integer`);
  return n;
}

function toQuestionCount(value: string): QuestionCount {
  const n = Number.parseInt(value, 10);
  if ((QUESTION_COUNTS as readonly number[]).includes(n)) return n as QuestionCount;
  throw new Error(`--question-count must be one of ${QUESTION_COUNTS.join(", ")}`);
}

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function getAiClient(options: Options): AIClient | null {
  if (options.mode === "stub") {
    return new StubAIClient(options.questionCount, options.stubAiMs, options.stubAiJitterMs);
  }

  const ai = createAIClient();
  if (!ai) {
    throw new Error("OPENAI_API_KEY is required for --mode openai");
  }
  return ai;
}

function assertSafeOptions(options: Options) {
  const totalRequests = options.users * options.requestsPerUser;
  if (options.mode === "openai" && totalRequests > 50 && !options.allowExpensive) {
    throw new Error(
      `Refusing to run ${totalRequests} real OpenAI requests without --allow-expensive. Start smaller, then scale with intent.`,
    );
  }
}

async function createLoadUsers(runId: string, count: number): Promise<LoadUser[]> {
  const data = Array.from({ length: count }, (_, index) => ({
    email: `loadtest+${runId}-${index + 1}@memora.local`,
    name: `Load Test ${index + 1}`,
    subscriptionTier: "master",
    onboardingCompleted: true,
  }));

  await prisma.user.createMany({ data, skipDuplicates: true });

  const users = await prisma.user.findMany({
    where: { email: { startsWith: `loadtest+${runId}-` } },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email ?? "",
  }));
}

async function cleanupLoadUsers(runId: string) {
  await prisma.user.deleteMany({
    where: { email: { startsWith: `loadtest+${runId}-` } },
  });
}

async function runOne(
  ai: AIClient | null,
  userId: string,
  questionCount: QuestionCount,
  persist: boolean,
  index: number,
): Promise<TaskResult> {
  const started = Date.now();
  try {
    const input = {
      title: `LOAD TEST ${index + 1}`,
      summaryText:
        "A compact test source about memory, retrieval practice, and durable learning. Use clear factual wording and keep questions broad enough to exercise generation and storage paths.",
      notes:
        "We want a realistic generation payload for load testing. Focus on definitions, mechanisms, examples, tradeoffs, and misconceptions.",
      questionCount,
    };

    const { payload, usedFallback } = await generateQuizPayload(ai, input);

    if (persist) {
      await createQuizRequestWithQuota(userId, {
        title: input.title,
        summaryText: input.summaryText,
        notes: input.notes,
        questionCount,
        topic: payload.topic,
        generatedQuiz: JSON.stringify(payload),
        usedFallback,
        questions: payload.questions.map((question, order) => ({
          order,
          question: question.question,
          options: JSON.stringify(question.options),
          correctIndex: question.correctIndex,
          explanation: question.explanation,
        })),
      });
    }

    return {
      ok: true,
      durationMs: Date.now() - started,
      usedFallback,
      questionCount: payload.questions.length,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - started,
      usedFallback: false,
      questionCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function workerPool<T>(concurrency: number, total: number, task: (index: number) => Promise<T>) {
  let nextIndex = 0;
  const out = new Array<T>(total);

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex++;
      if (current >= total) return;
      out[current] = await task(current);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runPlan = buildRunPlan(options);
  const summaries: RunSummary[] = [];

  for (const step of runPlan) {
    summaries.push(await executeRun(step));
  }

  if (options.outputJson) {
    await mkdir(dirname(options.outputJson), { recursive: true });
    await writeFile(options.outputJson, JSON.stringify(summaries, null, 2), "utf8");
    console.log(`\nSaved JSON summary to ${options.outputJson}`);
  }
}

function buildRunPlan(options: Options): Options[] {
  if (options.preset === "persist-ramp") {
    return [100, 250, 500, 1000].map((users) => ({
      ...options,
      users,
      concurrency: users,
      persist: true,
      preset: "single",
    }));
  }

  if (options.preset === "openai-smoke") {
    return [
      {
        ...options,
        mode: "openai",
        users: 10,
        concurrency: 5,
        requestsPerUser: 1,
        persist: false,
        allowExpensive: true,
        preset: "single",
      },
    ];
  }

  return [options];
}

async function executeRun(options: Options): Promise<RunSummary> {
  assertSafeOptions(options);

  const totalRequests = options.users * options.requestsPerUser;
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const ai = getAiClient(options);
  const label = `${options.mode}:${options.persist ? "persist" : "nopersist"}:${options.users}u:${options.concurrency}c:${options.questionCount}q`;

  console.log("=== Memora Quiz Generation Stress Test ===");
  console.log(JSON.stringify({ label, ...options, totalRequests, runId }, null, 2));
  console.log("");

  const users = await createLoadUsers(runId, options.users);
  if (users.length !== options.users) {
    throw new Error(`Expected ${options.users} load-test users, created ${users.length}`);
  }

  const started = Date.now();
  let results: TaskResult[] = [];

  try {
    results = await workerPool(options.concurrency, totalRequests, async (index) => {
      const user = users[index % users.length];
      if (!user) throw new Error(`Missing user for request index ${index}`);
      return runOne(ai, user.id, options.questionCount, options.persist, index);
    });
  } finally {
    if (options.cleanup) {
      await cleanupLoadUsers(runId);
    }
  }

  const totalDurationMs = Date.now() - started;
  const successes = results.filter((result) => result.ok);
  const failures = results.filter((result) => !result.ok);
  const fallbackCount = successes.filter((result) => result.usedFallback).length;
  const latencies = successes.map((result) => result.durationMs);

  const throughput = totalRequests / Math.max(totalDurationMs / 1000, 0.001);
  const failureGroups = new Map<string, number>();
  for (const failure of failures) {
    const key = failure.error ?? "Unknown error";
    failureGroups.set(key, (failureGroups.get(key) ?? 0) + 1);
  }

  console.log("");
  console.log("=== Results ===");
  console.log(`Requests: ${totalRequests}`);
  console.log(`Successes: ${successes.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Fallback responses: ${fallbackCount}`);
  console.log(`Wall time: ${formatMs(totalDurationMs)}`);
  console.log(`Throughput: ${throughput.toFixed(2)} req/s`);

  const latencyP50Ms = latencies.length > 0 ? percentile(latencies, 50) : 0;
  const latencyP95Ms = latencies.length > 0 ? percentile(latencies, 95) : 0;
  const latencyP99Ms = latencies.length > 0 ? percentile(latencies, 99) : 0;
  const latencyMaxMs = latencies.length > 0 ? Math.max(...latencies) : 0;

  if (latencies.length > 0) {
    console.log(`Latency p50: ${formatMs(latencyP50Ms)}`);
    console.log(`Latency p95: ${formatMs(latencyP95Ms)}`);
    console.log(`Latency p99: ${formatMs(latencyP99Ms)}`);
    console.log(`Latency max: ${formatMs(latencyMaxMs)}`);
  }

  if (failureGroups.size > 0) {
    console.log("");
    console.log("=== Failure Breakdown ===");
    for (const [message, count] of Array.from(failureGroups.entries())) {
      console.log(`${count}x ${message}`);
    }
  }

  console.log("");
  if (options.mode === "stub") {
    console.log(
      "Note: stub mode measures Memora + Prisma concurrency with simulated AI latency. It does NOT prove the real OpenAI path can sustain the same load.",
    );
  } else {
    console.log(
      "Note: openai mode includes the real upstream model dependency, so failures or latency spikes may come from provider-side limits as much as from Memora itself.",
    );
  }

  return {
    label,
    options,
    totalRequests,
    successes: successes.length,
    failures: failures.length,
    fallbackCount,
    wallTimeMs: totalDurationMs,
    throughputReqPerSecond: throughput,
    latencyP50Ms,
    latencyP95Ms,
    latencyP99Ms,
    latencyMaxMs,
    failureBreakdown: Object.fromEntries(failureGroups.entries()),
  };
}

main()
  .catch((error) => {
    console.error("[stress-generate-quiz] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
