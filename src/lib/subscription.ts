import { Prisma, type QuizRequest, type QuizQuestion } from "@prisma/client";
import prisma from "./db";
import {
  TIERS,
  getTier,
  normalizeTierId,
  isQuestionCountAllowedForTier,
  type TierId,
} from "./tiers";

/**
 * Subscription runtime adapter.
 *
 * `lib/tiers.ts` is the config source of truth — this file is the database
 * + request-flow adapter on top of it. Keep it thin: look up the user,
 * resolve to a TierId, delegate all business rules to the tier record.
 *
 * Historical note: we used to support a 2-tier model (`free` | `pro`). The
 * 4-tier rollout maps any lingering `pro` value to `master`, which matches
 * the old pro tier's behaviour (50 Q, unlimited daily). See the raw SQL
 * migration in prisma/migrations for the one-shot data rewrite.
 */
export type SubscriptionTier = TierId;

/**
 * Legacy aliases. The `FREE_DAILY_QUIZ_LIMIT` constant is still used at the
 * dashboard page boundary — keep exporting it to avoid a wide refactor,
 * but treat it as derived data, not a source of truth.
 */
export const FREE_DAILY_QUIZ_LIMIT = TIERS.free.dailyQuizLimit ?? 0;
export const PRO_DAILY_QUIZ_LIMIT = TIERS.master.dailyQuizLimit ?? Number.POSITIVE_INFINITY;

export class QuotaExceededError extends Error {
  constructor(public readonly dailyLimit: number) {
    super(
      `You've reached your daily limit of ${dailyLimit} quizzes. Try again tomorrow or upgrade for more.`,
    );
    this.name = "QuotaExceededError";
  }
}

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  // Map legacy `pro` → `master` at read time in case any rows predate the
  // data migration. Harmless if they're already migrated.
  const raw = user?.subscriptionTier === "pro" ? "master" : user?.subscriptionTier;
  return normalizeTierId(raw);
}

export function getMaxQuestions(tier: SubscriptionTier): number {
  return getTier(tier).maxQuestionsPerQuiz;
}

export function getAllowedQuestionCounts(tier: SubscriptionTier): number[] {
  const t = getTier(tier);
  if (!t.canCustomQuiz) return [];
  return [10, 20, 30, 40, 50].filter((n) => n <= t.maxQuestionsPerQuiz);
}

/**
 * Effective daily cap for the given tier. `null` → unlimited (master tier).
 * Rendered at the dashboard page boundary as `Infinity` for the existing
 * limit-display UI that predates the null-unlimited shape.
 */
export function getDailyLimit(tier: SubscriptionTier): number {
  const cap = getTier(tier).dailyQuizLimit;
  return cap == null ? Number.POSITIVE_INFINITY : cap;
}

export async function getDailyQuizCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  return prisma.quizRequest.count({
    where: {
      userId,
      usedFallback: false,
      createdAt: { gte: startOfDay },
    },
  });
}

export async function canGenerateQuiz(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  dailyCount: number;
  dailyLimit: number;
  /** `upgradeReason` lets the client pick the right CTA — gate vs. cap vs. size. */
  upgradeReason?: "custom_quiz" | "daily_limit";
}> {
  const tier = await getUserSubscription(userId);
  const tierConfig = getTier(tier);

  // Free tier can't generate at all — surfaces as an "upgrade to unlock"
  // state on the client, not a "you're over quota" state.
  if (!tierConfig.canCustomQuiz) {
    return {
      allowed: false,
      reason:
        "Custom quizzes are part of our paid plans. Upgrade to start turning your notes into quizzes.",
      dailyCount: 0,
      dailyLimit: 0,
      upgradeReason: "custom_quiz",
    };
  }

  const limit = getDailyLimit(tier);
  const dailyCount = await getDailyQuizCount(userId);

  if (Number.isFinite(limit) && dailyCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached your daily limit of ${limit} quizzes. Upgrade for more or try again tomorrow.`,
      dailyCount,
      dailyLimit: limit,
      upgradeReason: "daily_limit",
    };
  }
  return {
    allowed: true,
    dailyCount,
    dailyLimit: Number.isFinite(limit) ? limit : Number.POSITIVE_INFINITY,
  };
}

export function isQuestionCountAllowed(tier: SubscriptionTier, count: number): boolean {
  return isQuestionCountAllowedForTier(tier, count);
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
  const limit = getDailyLimit(tier);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Only count successful (non-fallback) quizzes — same rule as the
        // soft check, so the two stay consistent. Unlimited tiers skip the
        // count entirely.
        if (Number.isFinite(limit) && !data.usedFallback) {
          const dailyCount = await tx.quizRequest.count({
            where: {
              userId,
              usedFallback: false,
              createdAt: { gte: startOfDay },
            },
          });
          if (dailyCount >= limit) {
            throw new QuotaExceededError(limit);
          }
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
    // Postgres serialization failure (P2034 / 40001) → treat as a lost race
    // for the last quota slot, semantically equivalent to QuotaExceeded.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2034"
    ) {
      throw new QuotaExceededError(Number.isFinite(limit) ? limit : 0);
    }
    throw err;
  }
}
