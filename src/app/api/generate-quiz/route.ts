import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createAIClient } from "@/lib/ai";
import { generateQuizPayload, buildPromptBundle } from "@/lib/quiz-generator";
import { generateQuizBodySchema } from "@/lib/schemas/quiz";
import {
  getUserSubscription,
  canGenerateQuiz,
  createQuizRequestWithQuota,
  QuotaExceededError,
  isQuestionCountAllowed,
} from "@/lib/subscription";
import { ratelimitGenerateQuiz } from "@/lib/rate-limit";

// OpenAI generation can take 10–30s for larger quizzes — bump from the
// default 15s ceiling so we don't 504 mid-call.
export const runtime = "nodejs";
export const maxDuration = 60;

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

  // F2P restructure: free tier cannot generate custom quizzes. The dashboard
  // UI hides the form for free users, but we still gate server-side so
  // curl/bypass attempts fail cleanly with an upgrade hint.
  const tier = await getUserSubscription(userId);
  if (tier === "free") {
    return NextResponse.json(
      {
        error:
          "Custom quizzes are part of our paid plans. Join the waitlist to be notified when they launch.",
        upgradeRequired: true,
      },
      { status: 403 },
    );
  }

  // Soft daily-quota check — fast, no lock. Avoids burning an OpenAI call
  // for users who are already over their limit (the UI normally disables
  // the button, but a curl request would skip that). The strict version
  // runs as part of the create transaction below.
  const quota = await canGenerateQuiz(userId);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason, dailyLimitReached: true }, { status: 429 });
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

  // Enforce question count limits based on subscription. `tier` is already
  // fetched above for the free-tier gate.
  if (!isQuestionCountAllowed(tier, questionCount)) {
    return NextResponse.json(
      { error: "Upgrade to Pro to unlock more than 10 questions per quiz.", upgradeRequired: true },
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

  const ai = createAIClient();
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
}
