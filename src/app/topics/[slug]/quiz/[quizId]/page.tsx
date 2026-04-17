import { requireUserId } from "@/lib/auth";
import { getPremadeQuizById } from "@/lib/topics";
import { getUserSubscription } from "@/lib/subscription";
import { notFound } from "next/navigation";
import Link from "next/link";
import { QuizExperience } from "@/components/quiz/quiz-experience";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: { slug: string; quizId: string };
};

export default async function PremadeQuizPage({ params }: PageProps) {
  // Auth required to play (scores need a userId)
  const userId = await requireUserId();
  const subscriptionTier = await getUserSubscription(userId);

  const premade = await getPremadeQuizById(params.quizId, subscriptionTier);
  if (!premade || premade.topic.slug !== params.slug) notFound();

  const questions = premade.quizRequest.questions.flatMap((row) => {
    let options: string[];
    try {
      const parsed = JSON.parse(row.options);
      if (!Array.isArray(parsed)) return [];
      options = parsed as string[];
    } catch {
      return [];
    }
    return [{
      id: row.id,
      question: row.question,
      options,
      correctIndex: row.correctIndex,
      explanation: row.explanation,
    }];
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/topics/${params.slug}`}>
          <Button type="button" variant="ghost" className="!px-0 !text-sm">
            &larr; Back to {premade.topic.name}
          </Button>
        </Link>
      </div>
      <QuizExperience
        key={premade.quizRequest.id}
        initialQuizRequestId={premade.quizRequest.id}
        topic={premade.title}
        questions={questions}
        initialFallbackNotice={null}
      />
    </div>
  );
}
