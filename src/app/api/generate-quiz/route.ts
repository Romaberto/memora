import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createAIClient } from "@/lib/ai";
import { generateQuizPayload, buildPromptBundle } from "@/lib/quiz-generator";
import { generateQuizBodySchema } from "@/lib/schemas/quiz";
import { acquireQuizGenerationLease } from "@/lib/quiz-generation-capacity";
import {
  getUserSubscription,
  canGenerateQuiz,
  createQuizRequestWithQuota,
  QuotaExceededError,
  isQuestionCountAllowed,
} from "@/lib/subscription";
import { ratelimitGenerateQuiz } from "@/lib/rate-limit";

// OpenAI generation can take close to a minute for 40–50 question quizzes,
// especially when quality gates trigger a repair pass.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Edge rate limit BEFORE any expensive work — burns no DB or OpenAI quota
  // when the limit is exceeded. Keyed by userId (not IP) so legitimate users
  // sharing an IP/NAT are not penalised. Gracefully no-ops if Upstash isn't
  // configured.
  const rl = await ratelimitGenerateQuiz(`user:${userId}`);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again in a moment.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds ?? 5),
          "X-RateLimit-Limit": String(rl.limit ?? ""),
          "X-RateLimit-Remaining": String(rl.remaining ?? ""),
        },
      },
    );
  }

  // Tier gate — free tier has no custom generation at all (returns 403 with
  // `upgradeReason: "custom_quiz"`). Paid tiers over their daily cap return
  // 429 with `upgradeReason: "daily_limit"`. The client uses these to choose
  // between the pricing modal and a "try again tomorrow" message.
  const tier = await getUserSubscription(userId);
  const quota = await canGenerateQuiz(userId);
  if (!quota.allowed) {
    const status = quota.upgradeReason === "custom_quiz" ? 403 : 429;
    return NextResponse.json(
      {
        error: quota.reason,
        upgradeRequired: quota.upgradeReason === "custom_quiz",
        dailyLimitReached: quota.upgradeReason === "daily_limit",
        upgradeReason: quota.upgradeReason,
      },
      { status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateQuizBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, summaryText, notes, questionCount, debugIncludePrompt } =
    parsed.data;

  // Enforce tier-specific question count ceilings. Builder caps at 20,
  // Scholar at 30, Master at 50. The client dropdown filters to the same
  // set, so hitting this error implies a tampered payload.
  if (!isQuestionCountAllowed(tier, questionCount)) {
    return NextResponse.json(
      {
        error:
          "Your plan doesn't allow quizzes this long. Upgrade for more questions per quiz.",
        upgradeRequired: true,
        upgradeReason: "question_count",
      },
      { status: 403 },
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[generate-quiz] questionCount from client:", questionCount);
  }

  if (
    !title?.trim() &&
    !summaryText.trim() &&
    !notes?.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Please provide at least a title, a summary, or notes so we can generate a useful quiz.",
      },
      { status: 400 },
    );
  }

  const lease = await acquireQuizGenerationLease();
  if (!lease.acquired) {
    return NextResponse.json(
      {
        error: "Quiz generation is busy right now. Please try again in a moment.",
        retryAfterSeconds: lease.retryAfterSeconds,
        capacityLimit: lease.limit,
        inFlight: lease.inFlight,
      },
      {
        status: 503,
        headers: { "Retry-After": String(lease.retryAfterSeconds ?? 5) },
      },
    );
  }

  const ai = createAIClient();
  try {
    const { payload, rawModelJson, usedFallback, fallbackReason } =
      await generateQuizPayload(ai, {
        title,
        summaryText,
        notes,
        questionCount,
      });

    // Atomic create-with-quota: re-checks the daily count inside a SERIALIZABLE
    // transaction so two concurrent requests can't both slip past the limit.
    // Throws QuotaExceededError if the user used their last slot in another
    // tab/request between the soft pre-check above and now.
    let quizRequest;
    try {
      quizRequest = await createQuizRequestWithQuota(userId, {
        title: title?.trim() || null,
        summaryText: summaryText.trim(),
        notes: notes?.trim() || null,
        questionCount,
        topic: payload.topic,
        generatedQuiz: JSON.stringify(payload),
        usedFallback,
        questions: payload.questions.map((q, idx) => ({
          order: idx,
          question: q.question,
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return NextResponse.json(
          { error: err.message, dailyLimitReached: true },
          { status: 429 },
        );
      }
      console.error("[generate-quiz] Failed to persist quiz:", err);
      return NextResponse.json({ error: "Failed to save quiz. Please try again." }, { status: 500 });
    }

    const questionsOut = quizRequest.questions.map((row) => {
      let options: string[];
      try {
        options = JSON.parse(row.options) as string[];
      } catch {
        options = [];
      }
      return { id: row.id, question: row.question, options, correctIndex: row.correctIndex, explanation: row.explanation };
    });

    const response: Record<string, unknown> = {
      quizRequestId: quizRequest.id,
      topic: quizRequest.topic,
      questions: questionsOut,
      usedFallback,
      ...(usedFallback && fallbackReason ? { fallbackReason } : {}),
    };

    if (debugIncludePrompt && process.env.NODE_ENV === "development") {
      response.debugPrompt = buildPromptBundle({
        title,
        summaryText,
        notes,
        questionCount,
      });
      if (rawModelJson) response.debugRawModelJson = rawModelJson;
    }

    return NextResponse.json(response);
  } finally {
    await lease.release();
  }
}
