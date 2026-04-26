import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";

type CapacityConfig = {
  configured: boolean;
  enabled: boolean;
  maxInFlight: number;
  ttlSeconds: number;
};

export type QuizGenerationCapacitySnapshot = {
  configured: boolean;
  enabled: boolean;
  limit: number | null;
  ttlSeconds: number | null;
  inFlight: number | null;
  saturated: boolean | null;
  error?: string;
};

export type QuizGenerationLease = {
  acquired: boolean;
  configured: boolean;
  limit: number | null;
  inFlight: number | null;
  retryAfterSeconds?: number;
  release: () => Promise<void>;
  error?: string;
};

const DEFAULT_MAX_IN_FLIGHT = 40;
const DEFAULT_TTL_SECONDS = 180;
const REDIS_KEY = "memora:quiz_generation:inflight";

let redis: Redis | null = null;
let initialized = false;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getCapacityConfig(): CapacityConfig {
  const configured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  const maxInFlight = parsePositiveInt(
    process.env.QUIZ_GENERATION_MAX_IN_FLIGHT,
    DEFAULT_MAX_IN_FLIGHT,
  );
  const ttlSeconds = parsePositiveInt(
    process.env.QUIZ_GENERATION_SLOT_TTL_SECONDS,
    DEFAULT_TTL_SECONDS,
  );
  return {
    configured,
    enabled: configured && maxInFlight > 0,
    maxInFlight,
    ttlSeconds,
  };
}

function getRedis(): Redis | null {
  if (initialized) return redis;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

async function cleanupExpiredEntries(client: Redis, now: number) {
  await client.zremrangebyscore(REDIS_KEY, 0, now);
}

export async function getQuizGenerationCapacitySnapshot(): Promise<QuizGenerationCapacitySnapshot> {
  const config = getCapacityConfig();
  if (!config.configured) {
    return {
      configured: false,
      enabled: false,
      limit: null,
      ttlSeconds: null,
      inFlight: null,
      saturated: null,
    };
  }

  const client = getRedis();
  if (!client) {
    return {
      configured: false,
      enabled: false,
      limit: null,
      ttlSeconds: null,
      inFlight: null,
      saturated: null,
    };
  }

  try {
    const now = Date.now();
    await cleanupExpiredEntries(client, now);
    const inFlight = Number(await client.zcard(REDIS_KEY));
    return {
      configured: true,
      enabled: config.enabled,
      limit: config.maxInFlight,
      ttlSeconds: config.ttlSeconds,
      inFlight,
      saturated: inFlight >= config.maxInFlight,
    };
  } catch (error) {
    return {
      configured: true,
      enabled: config.enabled,
      limit: config.maxInFlight,
      ttlSeconds: config.ttlSeconds,
      inFlight: null,
      saturated: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function acquireQuizGenerationLease(): Promise<QuizGenerationLease> {
  const config = getCapacityConfig();
  if (!config.enabled) {
    return {
      acquired: true,
      configured: config.configured,
      limit: config.configured ? config.maxInFlight : null,
      inFlight: null,
      release: async () => {},
    };
  }

  const client = getRedis();
  if (!client) {
    return {
      acquired: true,
      configured: false,
      limit: null,
      inFlight: null,
      release: async () => {},
    };
  }

  const token = randomUUID();
  const expiresAt = Date.now() + config.ttlSeconds * 1000;
  let released = false;

  const release = async () => {
    if (released) return;
    released = true;
    try {
      await client.zrem(REDIS_KEY, token);
    } catch (error) {
      console.error("[quiz-generation-capacity] Failed to release slot:", error);
    }
  };

  try {
    await cleanupExpiredEntries(client, Date.now());
    await client.zadd(REDIS_KEY, { score: expiresAt, member: token });
    await client.expire(REDIS_KEY, config.ttlSeconds);
    const inFlight = Number(await client.zcard(REDIS_KEY));

    if (inFlight > config.maxInFlight) {
      await release();
      return {
        acquired: false,
        configured: true,
        limit: config.maxInFlight,
        inFlight: Math.max(0, inFlight - 1),
        retryAfterSeconds: 5,
        release: async () => {},
      };
    }

    return {
      acquired: true,
      configured: true,
      limit: config.maxInFlight,
      inFlight,
      release,
    };
  } catch (error) {
    console.error("[quiz-generation-capacity] Failed to acquire slot, failing open:", error);
    return {
      acquired: true,
      configured: true,
      limit: config.maxInFlight,
      inFlight: null,
      error: error instanceof Error ? error.message : String(error),
      release: async () => {},
    };
  }
}
