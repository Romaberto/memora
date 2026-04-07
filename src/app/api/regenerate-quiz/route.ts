import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { createAIClient } from "@/lib/ai";
import { generateQuizPayload } from "@/lib/quiz-generator";
import { z } from "zod";
import { isQuestionCount } from "@/lib/schemas/quiz";

const bodySchema = z.object({
  fromQuizRequestId: z.string().min(1),
});

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const prev = await prisma.quizRequest.findFirst({
    where: { id: parsed.data.fromQuizRequestId, userId },
  });

  if (!prev) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isQuestionCount(prev.questionCount)) {
    return NextResponse.json({ error: "Invalid stored question count" }, { status: 500 });
  }

  const ai = createAIClient();
  const { payload, usedFallback, fallbackReason } = await generateQuizPayload(
    ai,
    {
    title: prev.title,
    summaryText: prev.summaryText,
    notes: prev.notes,
    questionCount: prev.questionCount,
    },
  );

  const quizRequest = await prisma.quizRequest.create({
    data: {
      userId,
      title: prev.title,
      summaryText: prev.summaryText,
      notes: prev.notes,
      questionCount: prev.questionCount,
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
    console.error("[regenerate-quiz] Failed to persist quiz:", err);
    return null;
  });

  if (!quizRequest) {
    return NextResponse.json({ error: "Failed to save regenerated quiz. Please try again." }, { status: 500 });
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

  return NextResponse.json({
    quizRequestId: quizRequest.id,
    topic: quizRequest.topic,
    questions: questionsOut,
    usedFallback,
    ...(usedFallback && fallbackReason ? { fallbackReason } : {}),
  });
}
