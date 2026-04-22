/**
 * Leaderboard aggregation.
 * Groups non-fallback QuizSession rows per user → sorts by activity points or
 * competitive score.
 *
 * Returns base points and streak (bonus) points separately so the UI can
 * display a breakdown while ranking by total. Competitive score is computed
 * from normalized quality signals so quiz volume and 50-question quizzes do
 * not dominate ranked play.
 */
import prisma from "./db";
import { getLeague } from "./leagues";

export type LeaderboardPeriod = "alltime" | "month" | "week";
export type LeaderboardSort = "activity" | "competitive";

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
  competitiveScore: number;
  competitiveAccuracy: number | null;
  competitiveQuizCredits: number;
  avgSecondsPerQuestion: number | null;
  league: string;        // league name derived from totalPoints
  rank: number;          // 1-based position in this result set
};

function periodStart(period: LeaderboardPeriod): Date | undefined {
  if (period === "week")  return new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

function competitiveQuizCap(period: LeaderboardPeriod): number {
  if (period === "week") return 5;
  if (period === "month") return 12;
  return 20;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateCompetitiveScore({
  period,
  weightedAccuracy,
  quizCredits,
  bestStreak,
  avgSecondsPerQuestion,
}: {
  period: LeaderboardPeriod;
  weightedAccuracy: number | null;
  quizCredits: number;
  bestStreak: number;
  avgSecondsPerQuestion: number | null;
}): number {
  if (weightedAccuracy == null || quizCredits <= 0) return 0;

  const cappedQuizCredits = Math.min(quizCredits, competitiveQuizCap(period));
  const accuracyScore = weightedAccuracy * 6;
  const completionScore = cappedQuizCredits * 18;
  const streakScore = Math.min(bestStreak, 12) * 10;
  const consistencyScore =
    weightedAccuracy >= 80 && cappedQuizCredits >= 3
      ? 50
      : weightedAccuracy >= 70 && cappedQuizCredits >= 2
        ? 30
        : 0;
  const paceScore =
    avgSecondsPerQuestion != null
      ? clamp((22 - avgSecondsPerQuestion) / 16, 0, 1) * 80
      : 0;

  const rawScore =
    accuracyScore + completionScore + streakScore + consistencyScore + paceScore;
  const lowAccuracyPenalty = weightedAccuracy < 50 ? 0.6 : 1;

  return Math.round(rawScore * lowAccuracyPenalty);
}

export async function getLeaderboard(
  period: LeaderboardPeriod = "alltime",
  take = 100,
  sort: LeaderboardSort = "activity",
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
      questionCount: true,
      streakMax: true,
      durationSeconds: true,
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
    competitiveWeight: number;
    competitivePctSum: number;
    normalizedQuizCredits: number;
    timedQuestionCount: number;
    durationSeconds: number;
  };
  const map = new Map<string, Agg>();

  for (const s of sessions) {
    const a = map.get(s.userId) ?? {
      totalPoints: 0,
      basePoints: 0,
      streakPoints: 0,
      quizCount: 0,
      pctSum: 0,
      bestStreak: 0,
      competitiveWeight: 0,
      competitivePctSum: 0,
      normalizedQuizCredits: 0,
      timedQuestionCount: 0,
      durationSeconds: 0,
    };
    const normalizedQuestions = Math.max(1, Math.min(s.questionCount, 20));
    const competitiveWeight = Math.max(0.5, normalizedQuestions / 20);
    a.totalPoints  += s.score;
    // For sessions created before the split, basePoints/streakPoints may be null.
    // In that case, attribute the entire score to basePoints (conservative).
    a.basePoints   += s.basePoints ?? s.score;
    a.streakPoints += s.streakPoints ?? 0;
    a.quizCount    += 1;
    a.pctSum       += s.percentage;
    a.bestStreak    = Math.max(a.bestStreak, s.streakMax);
    a.competitiveWeight += competitiveWeight;
    a.competitivePctSum += s.percentage * competitiveWeight;
    a.normalizedQuizCredits += competitiveWeight;
    if (s.durationSeconds != null && s.durationSeconds > 0 && s.questionCount > 0) {
      a.durationSeconds += s.durationSeconds;
      a.timedQuestionCount += s.questionCount;
    }
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
    const competitiveAccuracy =
      a.competitiveWeight > 0 ? a.competitivePctSum / a.competitiveWeight : null;
    const avgSecondsPerQuestion =
      a.timedQuestionCount > 0 ? a.durationSeconds / a.timedQuestionCount : null;
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
      competitiveScore: calculateCompetitiveScore({
        period,
        weightedAccuracy: competitiveAccuracy,
        quizCredits: a.normalizedQuizCredits,
        bestStreak: a.bestStreak,
        avgSecondsPerQuestion,
      }),
      competitiveAccuracy,
      competitiveQuizCredits: Math.min(a.normalizedQuizCredits, competitiveQuizCap(period)),
      avgSecondsPerQuestion,
      league      : getLeague(a.totalPoints).name,
    });
  }

  entries.sort((a, b) => {
    if (sort === "competitive") {
      return (
        b.competitiveScore - a.competitiveScore ||
        (b.competitiveAccuracy ?? 0) - (a.competitiveAccuracy ?? 0) ||
        b.bestStreak - a.bestStreak ||
        b.totalPoints - a.totalPoints
      );
    }
    return b.totalPoints - a.totalPoints;
  });

  return entries.slice(0, take).map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Returns the 1-based rank of a user, or 0 if not found. */
export function findUserRank(entries: LeaderboardEntry[], userId: string): number {
  const idx = entries.findIndex((e) => e.userId === userId);
  return idx === -1 ? 0 : idx + 1;
}
