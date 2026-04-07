import prisma from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { describeFallbackReason } from "@/lib/fallback-notice";
import { notFound } from "next/navigation";
import Link from "next/link";
import { QuizExperience } from "@/components/quiz/quiz-experience";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: { requestId: string };
  searchParams: { fallback?: string; reason?: string };
};

export default async function QuizPage({ params, searchParams }: PageProps) {
  const userId = await requireUserId();
  const { requestId } = params;

  const req = await prisma.quizRequest.findFirst({
    where: { id: requestId, userId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!req) notFound();

  const questions = req.questions.flatMap((row) => {
    let options: string[];
    try {
      const parsed = JSON.parse(row.options);
      if (!Array.isArray(parsed)) return [];
      options = parsed as string[];
    } catch {
      return [];
    }
    return [{ id: row.id, question: row.question, options, correctIndex: row.correctIndex, explanation: row.explanation }];
  });

  let initialFallbackNotice: string | null = null;
  if (searchParams.fallback === "1") {
    initialFallbackNotice = describeFallbackReason(searchParams.reason);
  } else if (req.topic.includes("(fallback)")) {
    initialFallbackNotice = describeFallbackReason();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard">
          <Button type="button" variant="ghost" className="!px-0 !text-sm">
            ← Back to dashboard
          </Button>
        </Link>
      </div>
      <QuizExperience
        key={req.id}
        initialQuizRequestId={req.id}
        topic={req.topic}
        questions={questions}
        initialFallbackNotice={initialFallbackNotice}
      />
    </div>
  );
}
