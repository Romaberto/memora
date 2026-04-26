/**
 * Live ops health + traffic snapshot.
 *
 *   GET /api/admin/health
 *
 * Returns DB + Redis reachability with measured latencies, plus traffic
 * counters scoped to recent windows so you can watch a test live. Locked to
 * admin users (see lib/admin.ts).
 *
 * Response shape is intentionally flat — the dashboard polls this every few
 * seconds, so the JSON should be small and fast to compute.
 */
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getDbRuntimeConfig } from "@/lib/db-runtime-config";
import { getQuizGenerationCapacitySnapshot } from "@/lib/quiz-generation-capacity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  configured: boolean;
  latencyMs: number | null;
  error?: string;
};

async function pingDb(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, configured: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      latencyMs: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

async function pingRedis(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { ok: false, configured: false, latencyMs: null };
  }
  const t0 = Date.now();
  try {
    const r = new Redis({ url, token });
    const pong = await r.ping();
    return {
      ok: pong === "PONG",
      configured: true,
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      latencyMs: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function GET() {
  // Auth
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = await isAdmin(userId);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Time windows
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Run health checks + counts in parallel.
  // Counts are wrapped individually so a single slow query doesn't stall the
  // whole response — and DB failures still let us return Redis status.
  const realQuiz = { usedFallback: false } as const;
  const safeCount = async <T>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch {
      return null;
    }
  };

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    db,
    redis,
    generationCapacity,
    usersTotal,
    quizzesToday,
    quizzes5m,
    quizzes1h,
    quizzes24h,
    sessions24h,
    activeUsers24h,
    avgScore24h,
    perMinuteRows,
    usersToday,
    usersThisWeek,
    usersThisMonth,
  ] = await Promise.all([
    pingDb(),
    pingRedis(),
    getQuizGenerationCapacitySnapshot(),
    safeCount(prisma.user.count({ where: { NOT: { email: "guest@memorize.local" } } })),
    safeCount(prisma.quizRequest.count({ where: { ...realQuiz, createdAt: { gte: startOfDay } } })),
    safeCount(prisma.quizRequest.count({ where: { ...realQuiz, createdAt: { gte: fiveMinAgo } } })),
    safeCount(prisma.quizRequest.count({ where: { ...realQuiz, createdAt: { gte: oneHourAgo } } })),
    safeCount(prisma.quizRequest.count({ where: { ...realQuiz, createdAt: { gte: oneDayAgo } } })),
    safeCount(prisma.quizSession.count({ where: { createdAt: { gte: oneDayAgo } } })),
    safeCount(
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint AS count
        FROM "QuizSession"
        WHERE "createdAt" >= ${oneDayAgo}
      `.then((rows) => Number(rows[0]?.count ?? 0)),
    ),
    safeCount(
      prisma.quizSession.aggregate({
        where: { createdAt: { gte: oneDayAgo } },
        _avg: { percentage: true },
      }),
    ),
    // For the sparkline: each row is a quiz request in the last hour. We
    // bucket into 60 one-minute slots client-side.
    safeCount(
      prisma.quizRequest.findMany({
        where: { ...realQuiz, createdAt: { gte: oneHourAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ),
    // Registration growth
    safeCount(prisma.user.count({ where: { NOT: { email: "guest@memorize.local" }, createdAt: { gte: startOfDay } } })),
    safeCount(prisma.user.count({ where: { NOT: { email: "guest@memorize.local" }, createdAt: { gte: oneWeekAgo } } })),
    safeCount(prisma.user.count({ where: { NOT: { email: "guest@memorize.local" }, createdAt: { gte: oneMonthAgo } } })),
  ]);

  // Bucket per-minute timeline (60 buckets, oldest → newest).
  const buckets = new Array<number>(60).fill(0);
  if (perMinuteRows) {
    for (const row of perMinuteRows) {
      const minutesAgo = Math.floor((now.getTime() - row.createdAt.getTime()) / 60000);
      const idx = 59 - minutesAgo; // 0 = 60 min ago, 59 = current minute
      if (idx >= 0 && idx < 60) buckets[idx] += 1;
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    db,
    dbRuntime: getDbRuntimeConfig(),
    redis,
    generationCapacity,
    metrics: {
      usersTotal,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      quizzesToday,
      quizzes5m,
      quizzes1h,
      quizzes24h,
      sessions24h,
      activeUsers24h,
      avgScore24h: avgScore24h?._avg.percentage ?? null,
    },
    perMinuteLastHour: buckets,
  });
}
