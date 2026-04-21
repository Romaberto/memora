import prisma from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { rankFromPercentage } from "@/lib/ranks";
import { getLeaderboard, findUserRank } from "@/lib/leaderboard";
import { getUserSubscription, getDailyQuizCount, getDailyLimit } from "@/lib/subscription";
import { getRecommendedQuizzes } from "@/lib/topics";
import { getProgressHistoryDaysForTier } from "@/lib/tiers";
import {
  DashboardView,
  type DashboardRelatedTopicSuggestion,
  type DashboardRequestRow,
  type DashboardSessionRow,
} from "@/components/dashboard/dashboard-view";

const nonFallbackRequest = { usedFallback: false } as const;

type PageProps = {
  searchParams?: {
    customTopic?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const userId = await requireUserId();
  const initialCustomTopic = normalizeCustomTopic(searchParams?.customTopic);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessionHistoryWhere = { userId, quizRequest: nonFallbackRequest };
  const [subscriptionTier, dailyQuizCount] = await Promise.all([
    getUserSubscription(userId),
    getDailyQuizCount(userId),
  ]);
  const progressHistoryDays = getProgressHistoryDaysForTier(subscriptionTier);
  const progressSince = new Date(
    Date.now() - progressHistoryDays * 24 * 60 * 60 * 1000,
  );

  // Fetch all dashboard + leaderboard data in parallel
  const [guest, dashboardData, leaderboardEntries, recommendedQuizzes, recentTopicIdeas, waitlistRow] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),

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
    // 1 hero + 3 alternates — see RecommendedQuizzes component.
    getRecommendedQuizzes(userId, subscriptionTier, 4).catch(() => []),
    getRecentTopicIdeas(userId).catch(() => []),
    // Waitlist status — used to switch the upsell CTA to a persistent
    // "you're on the list" state.
    prisma.waitlistSignup
      .findFirst({ where: { userId }, select: { id: true } })
      .catch(() => null),
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
      dailyQuizCount={dailyQuizCount}
      dailyQuizLimit={getDailyLimit(subscriptionTier)}
      recommendedQuizzes={recommendedQuizzes}
      recentTopicIdeas={recentTopicIdeas}
      userEmail={guest?.email ?? null}
      alreadyOnWaitlist={Boolean(waitlistRow)}
      initialCustomTopic={initialCustomTopic}
      stats={{ totalSessions, avgPercentage: avgPct, sessionsLast7Days: recentCount, overallRank, avgSecondsPerQuestion, estimatedTenQuestionSeconds }}
      leaderboard={{
        entries: leaderboardEntries,
        userRank,
        totalPlayers: leaderboardEntries.length,
        userTotalPoints: leaderboardEntries.find((e) => e.userId === userId)?.totalPoints ?? 0,
      }}
    />
  );
}

async function getRecentTopicIdeas(
  userId: string,
): Promise<DashboardRelatedTopicSuggestion[]> {
  const recentSessions = await prisma.quizSession.findMany({
    where: { userId, quizRequest: nonFallbackRequest },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true },
  });
  const sessionIds = recentSessions.map((session) => session.id);
  if (sessionIds.length === 0) return [];

  const rows = await prisma.relatedTopicSuggestion.findMany({
    where: {
      userId,
      dismissedAt: null,
      sourceSessionId: { in: sessionIds },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      angle: true,
      createdAt: true,
      sourceSession: {
        select: {
          createdAt: true,
          quizRequest: {
            select: {
              title: true,
              topic: true,
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const ideas: DashboardRelatedTopicSuggestion[] = [];
  for (const row of rows) {
    const key = row.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ideas.push({
      id: row.id,
      title: row.title,
      angle: row.angle,
      sourceTitle: row.sourceSession.quizRequest.title ?? row.sourceSession.quizRequest.topic,
      sourceCreatedAt: row.sourceSession.createdAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    });
    if (ideas.length >= 5) break;
  }

  return ideas;
}

function normalizeCustomTopic(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 140);
}
