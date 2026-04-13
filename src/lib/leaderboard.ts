/**
 * Leaderboard aggregation.
 * Groups non-fallback QuizSession rows per user → sorts by total points desc.
 *
 * Returns base points and streak (bonus) points separately so the UI can
 * display a breakdown while ranking by total.
 */
import prisma from "./db";
import { getLeague } from "./leagues";

export type LeaderboardPeriod = "alltime" | "month" | "week";

export type LeaderboardEntry = {
  userId: string;
  displayName: string;   // nickname if set, else name
  fullName: string;
  avatarUrl: string;
  totalPoints: number;
  basePoints: number;    // sum of base points (10 per correct)
  streakPoints: number;  // sum of streak bonus points
  quizCount: number;
  avgAccuracy: number | null;  // percentage 0–100
  bestStreak: number;
  league: string;        // league name derived from totalPoints
  rank: number;          // 1-based position in this result set
};

function periodStart(period: LeaderboardPeriod): Date | undefined {
  if (period === "week")  return new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

export async function getLeaderboard(
  period: LeaderboardPeriod = "alltime",
  take = 100,
): Promise<LeaderboardEntry[]> {
  const since = periodStart(period);

  // Fetch every non-fallback session in the window (capped at 50 k rows)
  const sessions = await prisma.quizSession.findMany({
    where: {
      quizRequest: { usedFallback: false },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: {
      userId: true,
      score: true,
      basePoints: true,
      streakPoints: true,
      percentage: true,
      streakMax: true,
    },
    take: 50_000,
  });

  // Aggregate per user in memory
  type Agg = {
    totalPoints: number;
    basePoints: number;
    streakPoints: number;
    quizCount: number;
    pctSum: number;
    bestStreak: number;
  };
  const map = new Map<string, Agg>();

  for (const s of sessions) {
    const a = map.get(s.userId) ?? { totalPoints: 0, basePoints: 0, streakPoints: 0, quizCount: 0, pctSum: 0, bestStreak: 0 };
    a.totalPoints  += s.score;
    // For sessions created before the split, basePoints/streakPoints may be null.
    // In that case, attribute the entire score to basePoints (conservative).
    a.basePoints   += s.basePoints ?? s.score;
    a.streakPoints += s.streakPoints ?? 0;
    a.quizCount    += 1;
    a.pctSum       += s.percentage;
    a.bestStreak    = Math.max(a.bestStreak, s.streakMax);
    map.set(s.userId, a);
  }

  // Pre-fetch all relevant Prisma User rows in one query
  const allUserIds = Array.from(map.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true, nickname: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Build entries
  const entries: Omit<LeaderboardEntry, "rank">[] = [];

  for (const [userId, a] of Array.from(map)) {
    if (a.totalPoints === 0) continue;
    const u = userMap.get(userId);
    entries.push({
      userId,
      displayName : u?.nickname || u?.name || "Player",
      fullName    : u?.name || "",
      avatarUrl   : u?.image || "",
      totalPoints : a.totalPoints,
      basePoints  : a.basePoints,
      streakPoints: a.streakPoints,
      quizCount   : a.quizCount,
      avgAccuracy : a.quizCount > 0 ? a.pctSum / a.quizCount : null,
      bestStreak  : a.bestStreak,
      league      : getLeague(a.totalPoints).name,
    });
  }

  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  return entries.slice(0, take).map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Returns the 1-based rank of a user, or 0 if not found. */
export function findUserRank(entries: LeaderboardEntry[], userId: string): number {
  const idx = entries.findIndex((e) => e.userId === userId);
  return idx === -1 ? 0 : idx + 1;
}
