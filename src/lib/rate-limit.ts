/**
 * Edge rate limiting via Upstash Redis.
 *
 * Designed to **gracefully degrade**: if `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN` are not set, every call returns
 * `{ success: true }` and the app behaves exactly as it did before. Local
 * development without Upstash keeps working — turn it on by populating the
 * env vars on Vercel.
 *
 * To provision:
 *   1. https://console.upstash.com/redis → Create database (free tier is fine)
 *   2. Copy "UPSTASH_REDIS_REST_URL" + "UPSTASH_REDIS_REST_TOKEN"
 *   3. Add both to Vercel → Project → Settings → Environment Variables
 *      (Production + Preview + Development)
 *   4. Add the same two to your local .env if you want to test it
 *
 * Limiter algorithm: sliding window. More forgiving than fixed-window because
 * a user who hits the limit at 0:59 doesn't get a free reset at 1:00.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
};

const ALWAYS_ALLOW: RateLimitResult = { success: true };

let redis: Redis | null = null;
let initialized = false;

function getRedis(): Redis | null {
  if (initialized) return redis;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[rate-limit] Upstash env vars not set — rate limiting disabled.");
    }
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

/**
 * Lazily-constructed limiters. Each one is keyed by purpose so quotas don't
 * mix (a heavy /api/auth/google user shouldn't burn /api/generate-quiz quota).
 */
function makeLimiter(purpose: string, requests: number, window: `${number} ${"s" | "m" | "h"}`): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `memora:rl:${purpose}`,
  });
}

let _generateQuizLimiter: Ratelimit | null | undefined;
let _googleAuthLimiter: Ratelimit | null | undefined;

function generateQuizLimiter(): Ratelimit | null {
  if (_generateQuizLimiter === undefined) {
    // 5 generations per minute per user — more than fast enough for honest
    // use, slow enough that an attacker can't burn $$$ of OpenAI credits.
    _generateQuizLimiter = makeLimiter("gen", 5, "1 m");
  }
  return _generateQuizLimiter;
}

function googleAuthLimiter(): Ratelimit | null {
  if (_googleAuthLimiter === undefined) {
    // 10 OAuth starts per minute per IP — generous enough for genuine
    // retry-clicking, tight enough to deter scripted abuse.
    _googleAuthLimiter = makeLimiter("oauth_google", 10, "1 m");
  }
  return _googleAuthLimiter;
}

async function check(limiter: Ratelimit | null, key: string): Promise<RateLimitResult> {
  if (!limiter) return ALWAYS_ALLOW;
  try {
    const { success, limit, remaining, reset } = await limiter.limit(key);
    const retryAfterSeconds = success
      ? undefined
      : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { success, limit, remaining, retryAfterSeconds };
  } catch (err) {
    // Never let Redis being down take down the app — fail open with a log.
    console.error("[rate-limit] limiter error, failing open:", err);
    return ALWAYS_ALLOW;
  }
}

export function ratelimitGenerateQuiz(key: string): Promise<RateLimitResult> {
  return check(generateQuizLimiter(), key);
}

export function ratelimitGoogleAuth(key: string): Promise<RateLimitResult> {
  return check(googleAuthLimiter(), key);
}

/**
 * Best-effort client IP extraction. Vercel sets `x-forwarded-for`; the first
 * entry is the real client. Falls back to "unknown" so the limiter still
 * functions (all unknown IPs share one bucket — better than crashing).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
