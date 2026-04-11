import prisma from "./db";

export type SubscriptionTier = "free" | "pro";

const FREE_MAX_QUESTIONS = 10;
export const FREE_DAILY_QUIZ_LIMIT = 3;

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  return (user?.subscriptionTier === "pro" ? "pro" : "free") as SubscriptionTier;
}

export function getMaxQuestions(tier: SubscriptionTier): number {
  return tier === "pro" ? 50 : FREE_MAX_QUESTIONS;
}

export function getAllowedQuestionCounts(tier: SubscriptionTier): number[] {
  return tier === "pro" ? [10, 20, 30, 40, 50] : [10];
}

export async function getDailyQuizCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.quizRequest.count({
    where: {
      userId,
      usedFallback: false,
      createdAt: { gte: startOfDay },
    },
  });
}

export async function canGenerateQuiz(userId: string): Promise<{ allowed: boolean; reason?: string; dailyCount: number; dailyLimit: number }> {
  const tier = await getUserSubscription(userId);

  const PRO_DAILY_QUIZ_LIMIT = 10;
  if (tier === "pro") {
    const dailyCount = await getDailyQuizCount(userId);
    if (dailyCount >= PRO_DAILY_QUIZ_LIMIT) {
      return {
        allowed: false,
        reason: `You've reached your daily limit of ${PRO_DAILY_QUIZ_LIMIT} quizzes.`,
        dailyCount,
        dailyLimit: PRO_DAILY_QUIZ_LIMIT,
      };
    }
    return { allowed: true, dailyCount, dailyLimit: PRO_DAILY_QUIZ_LIMIT };
  }

  const dailyCount = await getDailyQuizCount(userId);
  if (dailyCount >= FREE_DAILY_QUIZ_LIMIT) {
    return {
      allowed: false,
      reason: `You've reached your daily limit of ${FREE_DAILY_QUIZ_LIMIT} quizzes. Upgrade to Pro for unlimited quizzes!`,
      dailyCount,
      dailyLimit: FREE_DAILY_QUIZ_LIMIT,
    };
  }

  return { allowed: true, dailyCount, dailyLimit: FREE_DAILY_QUIZ_LIMIT };
}

export function isQuestionCountAllowed(tier: SubscriptionTier, count: number): boolean {
  return getAllowedQuestionCounts(tier).includes(count);
}
