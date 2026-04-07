import prisma from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { rankFromPercentage } from "@/lib/ranks";
import { getLeaderboard, findUserRank } from "@/lib/leaderboard";
import {
  DashboardView,
  type DashboardRequestRow,
  type DashboardSessionRow,
} from "@/components/dashboard/dashboard-view";

const nonFallbackRequest = { usedFallback: false } as const;

export default async function DashboardPage() {
  const userId = await requireUserId();

  const weekAgo      = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
  const progressSince = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  const sessionHistoryWhere = { userId, quizRequest: nonFallbackRequest };
  const subscriptionTier = process.env.MEMORIZE_PRO_SUBSCRIBER === "true" ? "pro" : "free";

  // Fetch all dashboard + leaderboard data in parallel
  const [guest, dashboardData, leaderboardEntries] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),

    Promise.all([
      prisma.quizRequest.findMany({
        where: { userId, ...nonFallbackRequest },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, topic: true, title: true, summaryText: true, notes: true, questionCount: true, createdAt: true },
      }),
      prisma.quizSession.findMany({
        where: sessionHistoryWhere,
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { quizRequest: { select: { topic: true, title: true } } },
      }),
      prisma.quizSession.count({ where: sessionHistoryWhere }),
      prisma.quizSession.aggregate({ where: sessionHistoryWhere, _avg: { percentage: true } }),
      prisma.quizSession.count({ where: { ...sessionHistoryWhere, createdAt: { gte: weekAgo } } }),
      prisma.quizSession.findMany({
        where: { ...sessionHistoryWhere, createdAt: { gte: progressSince } },
        orderBy: { createdAt: "desc" },
        select: { id: true, score: true, percentage: true, questionCount: true, createdAt: true, quizRequest: { select: { title: true, topic: true } } },
      }),
      prisma.quizSession.findMany({
        where: { ...sessionHistoryWhere, durationSeconds: { not: null } },
        select: { durationSeconds: true, questionCount: true },
        take: 1000,
      }),
    ]).catch((err: unknown) => {
      console.error("[dashboard] Failed to load dashboard data:", err);
      return null;
    }),

    getLeaderboard("alltime", 10).catch(() => []),
  ]);

  if (!dashboardData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Unable to load your dashboard right now.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Please refresh the page. If the problem persists, check your database connection.
        </p>
      </div>
    );
  }

  const [requests, sessions, totalSessions, avgRow, recentCount, progressSessions, paceRows] = dashboardData;

  const requestRows: DashboardRequestRow[] = requests.map((r) => ({
    id: r.id, topic: r.topic, title: r.title, summaryText: r.summaryText,
    notes: r.notes, questionCount: r.questionCount, createdAt: r.createdAt.toISOString(),
  }));

  const sessionRows: DashboardSessionRow[] = sessions.map((s) => ({
    id: s.id, topic: s.quizRequest.title ?? s.quizRequest.topic,
    score: s.score, percentage: s.percentage, rankName: s.rankName,
    questionCount: s.questionCount, createdAt: s.createdAt.toISOString(),
    durationSeconds: s.durationSeconds,
  }));

  let paceSeconds = 0, paceQuestions = 0;
  for (const p of paceRows) {
    if (p.durationSeconds != null && p.durationSeconds > 0) {
      paceSeconds += p.durationSeconds;
      paceQuestions += p.questionCount;
    }
  }
  const avgSecondsPerQuestion        = paceQuestions > 0 ? paceSeconds / paceQuestions : null;
  const estimatedTenQuestionSeconds  = avgSecondsPerQuestion != null ? avgSecondsPerQuestion * 10 : null;

  const dailyProgressSessions = progressSessions.map((s) => ({
    id: s.id, score: s.score, percentage: s.percentage, questionCount: s.questionCount,
    createdAt: s.createdAt.toISOString(), topic: s.quizRequest.title ?? s.quizRequest.topic,
  }));

  const avgPct      = avgRow._avg.percentage ?? null;
  const overallRank = avgPct != null ? rankFromPercentage(Math.round(avgPct)) : null;
  const userRank    = findUserRank(leaderboardEntries, userId);

  return (
    <DashboardView
      userName={guest?.name ?? "Guest"}
      requests={requestRows}
      sessions={sessionRows}
      dailyProgressSessions={dailyProgressSessions}
      subscriptionTier={subscriptionTier}
      stats={{ totalSessions, avgPercentage: avgPct, sessionsLast7Days: recentCount, overallRank, avgSecondsPerQuestion, estimatedTenQuestionSeconds }}
      leaderboard={{ entries: leaderboardEntries, userRank, totalPlayers: leaderboardEntries.length }}
    />
  );
}
