import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { createAIClient } from "@/lib/ai";
import { generateQuizPayload, buildPromptBundle } from "@/lib/quiz-generator";
import { generateQuizBodySchema } from "@/lib/schemas/quiz";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

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

  const quizRequest = await prisma.quizRequest.create({
    data: {
      userId,
      title: title?.trim() || null,
      summaryText: summaryText.trim(),
      notes: notes?.trim() || null,
      questionCount,
      topic: payload.topic,
      generatedQuiz: JSON.stringify(payload),
      usedFallback,
      questions: {
        create: payload.questions.map((q, idx) => ({
          order: idx,
          question: q.question,
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  }).catch((err: unknown) => {
    console.error("[generate-quiz] Failed to persist quiz:", err);
    return null;
  });

  if (!quizRequest) {
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
