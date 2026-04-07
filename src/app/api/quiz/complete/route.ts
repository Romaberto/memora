import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { completeQuizBodySchema } from "@/lib/schemas/quiz";
import { encouragingMessage, rankFromPercentage } from "@/lib/ranks";

const POINTS_PER_CORRECT = 10;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = completeQuizBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { quizRequestId, answers, durationSeconds } = parsed.data;

  const answerIds = answers.map((a) => a.quizQuestionId);
  if (new Set(answerIds).size !== answerIds.length) {
    return NextResponse.json(
      { error: "Duplicate answers for the same question" },
      { status: 400 },
    );
  }

  const request = await prisma.quizRequest.findFirst({
    where: { id: quizRequestId, userId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!request) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const byId = new Map(request.questions.map((q) => [q.id, q]));
  if (answers.length !== request.questions.length) {
    return NextResponse.json(
      { error: "Answer count does not match quiz length" },
      { status: 400 },
    );
  }

  const order = new Map(
    request.questions.map((question, i) => [question.id, i]),
  );
  const orderedAnswers = [...answers].sort(
    (a, b) => (order.get(a.quizQuestionId) ?? 0) - (order.get(b.quizQuestionId) ?? 0),
  );

  let correct = 0;
  let streak = 0;
  let streakMax = 0;
  let score = 0;

  const rows: {
    quizQuestionId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }[] = [];

  for (const a of orderedAnswers) {
    const q = byId.get(a.quizQuestionId);
    if (!q) {
      return NextResponse.json(
        { error: "Unknown question id in submission" },
        { status: 400 },
      );
    }
    const isCorrect = a.selectedIndex === q.correctIndex;
    if (isCorrect) {
      correct += 1;
      streak += 1;
      streakMax = Math.max(streakMax, streak);
      score += POINTS_PER_CORRECT;
    } else {
      streak = 0;
    }
    rows.push({
      quizQuestionId: a.quizQuestionId,
      selectedIndex: a.selectedIndex,
      isCorrect,
    });
  }

  const total = request.questions.length;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;
  const rankName = rankFromPercentage(percentage);

  const quizSession = await prisma.quizSession.create({
    data: {
      userId,
      quizRequestId: request.id,
      score,
      percentage,
      rankName,
      questionCount: total,
      streakMax,
      durationSeconds: durationSeconds ?? null,
      answers: {
        create: rows.map((r) => ({
          quizQuestionId: r.quizQuestionId,
          selectedIndex: r.selectedIndex,
          isCorrect: r.isCorrect,
        })),
      },
    },
  }).catch((err: unknown) => {
    console.error("[quiz/complete] Failed to persist session:", err);
    return null;
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Failed to save your results. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: quizSession.id,
    score,
    correct,
    total,
    percentage,
    rankName,
    message: encouragingMessage(percentage),
    streakMax,
    durationSeconds: quizSession.durationSeconds,
  });
}
