import { requireUserId } from "@/lib/auth";
import { findById } from "@/lib/csv-users";
import { rankFromPercentage } from "@/lib/ranks";
import prisma from "@/lib/db";
import { ProfileView } from "./profile-view";

const nonFallback = { usedFallback: false } as const;

export default async function ProfilePage() {
  const userId = await requireUserId();

  const csvUser = findById(userId);
  if (!csvUser) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">Profile not found.</p>
      </div>
    );
  }

  const sessionWhere = { userId, quizRequest: nonFallback };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [
    totalSessions,
    avgRow,
    bestRow,
    sessionsLast7,
    sessionsLast30,
    streakRow,
    paceRows,
  ] = await Promise.all([
    prisma.quizSession.count({ where: sessionWhere }),
    prisma.quizSession.aggregate({ where: sessionWhere, _avg: { percentage: true } }),
    prisma.quizSession.aggregate({ where: sessionWhere, _max: { percentage: true } }),
    prisma.quizSession.count({ where: { ...sessionWhere, createdAt: { gte: sevenDaysAgo } } }),
    prisma.quizSession.count({ where: { ...sessionWhere, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.quizSession.aggregate({ where: sessionWhere, _max: { streakMax: true } }),
    prisma.quizSession.findMany({
      where: { ...sessionWhere, durationSeconds: { not: null } },
      select: { durationSeconds: true, questionCount: true },
      take: 1000,
    }),
  ]);

  let paceSeconds = 0, paceQs = 0;
  for (const p of paceRows) {
    if (p.durationSeconds && p.durationSeconds > 0) {
      paceSeconds += p.durationSeconds;
      paceQs += p.questionCount;
    }
  }

  const avgPct = avgRow._avg.percentage ?? null;
  const bestPct = bestRow._max.percentage ?? null;

  return (
    <ProfileView
      user={{
        id: csvUser.id,
        name: csvUser.name,
        nickname: csvUser.nickname,
        email: csvUser.email,
        avatarUrl: csvUser.avatarUrl,
        memberSince: csvUser.createdAt,
      }}
      stats={{
        totalSessions,
        avgPercentage: avgPct,
        bestPercentage: bestPct,
        overallRank: avgPct != null ? rankFromPercentage(Math.round(avgPct)) : null,
        sessionsLast7,
        sessionsLast30,
        maxStreak: streakRow._max.streakMax ?? 0,
        avgSecondsPerQuestion: paceQs > 0 ? paceSeconds / paceQs : null,
      }}
    />
  );
}
