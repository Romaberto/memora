import { Redis } from "@upstash/redis";

type GenerationOutcome = "success" | "fallback" | "capacity_rejected" | "persist_error" | "provider_error";

export type QuizGenerationTelemetrySnapshot = {
  configured: boolean;
  last5mCount: number | null;
  successCount: number | null;
  fallbackCount: number | null;
  capacityRejectedCount: number | null;
  persistErrorCount: number | null;
  providerErrorCount: number | null;
  avgTotalMs: number | null;
  avgAiMs: number | null;
  avgPersistMs: number | null;
  p95TotalMs: number | null;
};

const WINDOW_SECONDS = 5 * 60;
const PREFIX = "memora:quiz_telemetry";

let redis: Redis | null = null;
let initialized = false;

function getRedis(): Redis | null {
  if (initialized) return redis;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function windowKey(metric: string) {
  return `${PREFIX}:${metric}`;
}

function parseNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

async function addRollingValue(client: Redis, key: string, value: number) {
  const now = Date.now();
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
  await client.zadd(key, { score: now, member: `${value}|${member}` });
  await client.zremrangebyscore(key, 0, now - WINDOW_SECONDS * 1000);
  await client.expire(key, WINDOW_SECONDS);
}

async function incrementRollingCounter(client: Redis, key: string) {
  const now = Date.now();
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
  await client.zadd(key, { score: now, member });
  await client.zremrangebyscore(key, 0, now - WINDOW_SECONDS * 1000);
  await client.expire(key, WINDOW_SECONDS);
}

async function readRollingCounter(client: Redis, key: string): Promise<number> {
  const now = Date.now();
  await client.zremrangebyscore(key, 0, now - WINDOW_SECONDS * 1000);
  return Number(await client.zcard(key));
}

async function readRollingNumbers(client: Redis, key: string): Promise<number[]> {
  const now = Date.now();
  await client.zremrangebyscore(key, 0, now - WINDOW_SECONDS * 1000);
  const members = await client.zrange<string[]>(key, 0, -1);
  return members
    .map((member) => Number.parseFloat(String(member).split("|")[0] ?? ""))
    .filter((value) => Number.isFinite(value));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? null;
}

export async function recordQuizGenerationTelemetry(input: {
  totalMs: number;
  aiMs: number | null;
  persistMs: number | null;
  outcome: GenerationOutcome;
}) {
  const client = getRedis();
  if (!client) return;

  try {
    await Promise.all([
      incrementRollingCounter(client, windowKey("count")),
      incrementRollingCounter(client, windowKey(`outcome:${input.outcome}`)),
      addRollingValue(client, windowKey("total_ms"), input.totalMs),
      ...(input.aiMs != null ? [addRollingValue(client, windowKey("ai_ms"), input.aiMs)] : []),
      ...(input.persistMs != null
        ? [addRollingValue(client, windowKey("persist_ms"), input.persistMs)]
        : []),
    ]);
  } catch (error) {
    console.error("[quiz-generation-telemetry] Failed to record:", error);
  }
}

export async function getQuizGenerationTelemetrySnapshot(): Promise<QuizGenerationTelemetrySnapshot> {
  const client = getRedis();
  if (!client) {
    return {
      configured: false,
      last5mCount: null,
      successCount: null,
      fallbackCount: null,
      capacityRejectedCount: null,
      persistErrorCount: null,
      providerErrorCount: null,
      avgTotalMs: null,
      avgAiMs: null,
      avgPersistMs: null,
      p95TotalMs: null,
    };
  }

  try {
    const [
      last5mCount,
      successCount,
      fallbackCount,
      capacityRejectedCount,
      persistErrorCount,
      providerErrorCount,
      totalMsValues,
      aiMsValues,
      persistMsValues,
    ] = await Promise.all([
      readRollingCounter(client, windowKey("count")),
      readRollingCounter(client, windowKey("outcome:success")),
      readRollingCounter(client, windowKey("outcome:fallback")),
      readRollingCounter(client, windowKey("outcome:capacity_rejected")),
      readRollingCounter(client, windowKey("outcome:persist_error")),
      readRollingCounter(client, windowKey("outcome:provider_error")),
      readRollingNumbers(client, windowKey("total_ms")),
      readRollingNumbers(client, windowKey("ai_ms")),
      readRollingNumbers(client, windowKey("persist_ms")),
    ]);

    return {
      configured: true,
      last5mCount,
      successCount,
      fallbackCount,
      capacityRejectedCount,
      persistErrorCount,
      providerErrorCount,
      avgTotalMs: parseNullableNumber(average(totalMsValues)),
      avgAiMs: parseNullableNumber(average(aiMsValues)),
      avgPersistMs: parseNullableNumber(average(persistMsValues)),
      p95TotalMs: parseNullableNumber(percentile(totalMsValues, 95)),
    };
  } catch (error) {
    console.error("[quiz-generation-telemetry] Failed to read snapshot:", error);
    return {
      configured: true,
      last5mCount: null,
      successCount: null,
      fallbackCount: null,
      capacityRejectedCount: null,
      persistErrorCount: null,
      providerErrorCount: null,
      avgTotalMs: null,
      avgAiMs: null,
      avgPersistMs: null,
      p95TotalMs: null,
    };
  }
}
