/**
 * Leaderboard aggregation.
 * Groups non-fallback QuizSession rows per user → sorts by total points desc.
 */
import prisma from "./db";
import { findById } from "./csv-users";

export type LeaderboardPeriod = "alltime" | "month" | "week";

export type LeaderboardEntry = {
  userId: string;
  displayName: string;   // nickname if set, else name
  fullName: string;
  avatarUrl: string;
  totalPoints: number;
  quizCount: number;
  avgAccuracy: number | null;  // percentage 0–100
  bestStreak: number;
  rank: number;              // 1-based position in this result set
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
      percentage: true,
      streakMax: true,
    },
    take: 50_000,
  });

  // Aggregate per user in memory
  type Agg = {
    totalPoints: number;
    quizCount: number;
    pctSum: number;
    bestStreak: number;
  };
  const map = new Map<string, Agg>();

  for (const s of sessions) {
    const a = map.get(s.userId) ?? { totalPoints: 0, quizCount: 0, pctSum: 0, bestStreak: 0 };
    a.totalPoints += s.score;
    a.quizCount  += 1;
    a.pctSum     += s.percentage;
    a.bestStreak  = Math.max(a.bestStreak, s.streakMax);
    map.set(s.userId, a);
  }

  // Pre-fetch Prisma User rows as fallback for userIds that have no CSV entry
  // (e.g. legacy guest accounts created before the CSV auth system was added)
  const allUserIds = Array.from(map.keys());
  const prismaUsers = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true, image: true },
  });
  const prismaUserMap = new Map(prismaUsers.map((u) => [u.id, u]));

  // Build entries, join with CSV user data (primary) or Prisma user data (fallback)
  const entries: Omit<LeaderboardEntry, "rank">[] = [];

  for (const [userId, a] of Array.from(map)) {
    if (a.totalPoints === 0) continue;
    const csvUser    = findById(userId);
    const prismaUser = prismaUserMap.get(userId);
    entries.push({
      userId,
      displayName : csvUser?.nickname || csvUser?.name || prismaUser?.name || "Player",
      fullName    : csvUser?.name || prismaUser?.name || "",
      avatarUrl   : csvUser?.avatarUrl || prismaUser?.image || "",
      totalPoints : a.totalPoints,
      quizCount   : a.quizCount,
      avgAccuracy : a.quizCount > 0 ? a.pctSum / a.quizCount : null,
      bestStreak  : a.bestStreak,
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
