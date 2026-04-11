import { Prisma, type QuizRequest, type QuizQuestion } from "@prisma/client";
import prisma from "./db";

export type SubscriptionTier = "free" | "pro";

const FREE_MAX_QUESTIONS = 10;
export const FREE_DAILY_QUIZ_LIMIT = 3;
export const PRO_DAILY_QUIZ_LIMIT = 10;

/**
 * Thrown by `createQuizRequestWithQuota` when the user's daily quota was
 * exhausted in a parallel request between the soft pre-check and the
 * transactional create. Routes should map this to a 429 response.
 */
export class QuotaExceededError extends Error {
  constructor(public readonly dailyLimit: number) {
    super(
      `You've reached your daily limit of ${dailyLimit} quizzes. Try again tomorrow or upgrade to Pro.`,
    );
    this.name = "QuotaExceededError";
  }
}

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
  const limit = tier === "pro" ? PRO_DAILY_QUIZ_LIMIT : FREE_DAILY_QUIZ_LIMIT;
  const dailyCount = await getDailyQuizCount(userId);

  if (dailyCount >= limit) {
    return {
      allowed: false,
      reason:
        tier === "pro"
          ? `You've reached your daily limit of ${limit} quizzes.`
          : `You've reached your daily limit of ${limit} quizzes. Upgrade to Pro for more!`,
      dailyCount,
      dailyLimit: limit,
    };
  }
  return { allowed: true, dailyCount, dailyLimit: limit };
}

export function isQuestionCountAllowed(tier: SubscriptionTier, count: number): boolean {
  return getAllowedQuestionCounts(tier).includes(count);
}

/**
 * Atomic create-with-quota.
 *
 * Re-counts the user's quizzes for the day inside a SERIALIZABLE transaction
 * and inserts the new QuizRequest only if there's still room. This closes the
 * TOCTOU race where two concurrent requests both pass a loose pre-check and
 * end up creating N+1 rows over the limit.
 *
 * Throws `QuotaExceededError` if the slot was taken between the pre-check
 * and the transaction. Routes should catch this and return 429.
 *
 * Postgres SERIALIZABLE uses optimistic concurrency: under heavy contention
 * one transaction will abort with code `40001` and we treat that as a quota
 * conflict (semantically, "someone else got the slot").
 */
export async function createQuizRequestWithQuota(
  userId: string,
  data: {
    title: string | null;
    summaryText: string;
    notes: string | null;
    questionCount: number;
    topic: string;
    generatedQuiz: string;
    usedFallback: boolean;
    questions: {
      order: number;
      question: string;
      options: string;
      correctIndex: number;
      explanation: string;
    }[];
  },
): Promise<QuizRequest & { questions: QuizQuestion[] }> {
  const tier = await getUserSubscription(userId);
  const limit = tier === "pro" ? PRO_DAILY_QUIZ_LIMIT : FREE_DAILY_QUIZ_LIMIT;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Only count successful (non-fallback) quizzes — same rule as the
        // soft check, so the two stay consistent.
        const dailyCount = await tx.quizRequest.count({
          where: {
            userId,
            usedFallback: false,
            createdAt: { gte: startOfDay },
          },
        });
        if (!data.usedFallback && dailyCount >= limit) {
          throw new QuotaExceededError(limit);
        }

        return tx.quizRequest.create({
          data: {
            userId,
            title: data.title,
            summaryText: data.summaryText,
            notes: data.notes,
            questionCount: data.questionCount,
            topic: data.topic,
            generatedQuiz: data.generatedQuiz,
            usedFallback: data.usedFallback,
            questions: { create: data.questions },
          },
          include: { questions: { orderBy: { order: "asc" } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    // Postgres serialization failure (40001) → treat as a lost race for the
    // last quota slot, semantically equivalent to QuotaExceeded.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2034" // "Transaction failed due to a write conflict or a deadlock"
    ) {
      throw new QuotaExceededError(limit);
    }
    throw err;
  }
}
