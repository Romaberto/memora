import { getTopicBySlug, getUserTopicProgress } from "@/lib/topics";
import { getSessionUserId } from "@/lib/auth";
import { TopicQuizList } from "@/components/topics/topic-quiz-list";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
};

export default async function TopicDetailPage({ params }: PageProps) {
  const topic = await getTopicBySlug(params.slug);
  if (!topic) notFound();

  const userId = await getSessionUserId();
  const progress = userId
    ? await getUserTopicProgress(userId, params.slug)
    : new Map<string, { score: number; percentage: number; rankName: string }>();

  const quizzes = topic.premadeQuizzes.map((pq) => {
    const best = progress.get(pq.quizRequest.id);
    return {
      id: pq.id,
      title: pq.title,
      quizNumber: pq.quizNumber,
      difficulty: pq.difficulty,
      questionCount: pq.quizRequest.questionCount,
      completed: !!best,
      bestScore: best?.score ?? null,
      bestPercentage: best?.percentage ?? null,
      bestRank: best?.rankName ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/topics"
          className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:hover:text-white"
        >
          &larr; All topics
        </Link>
        <div className="flex items-center gap-3">
          {topic.icon && <span className="text-3xl">{topic.icon}</span>}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {topic.description}
            </p>
          </div>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Quizzes coming soon
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Quizzes for this topic are being generated. Check back shortly!
          </p>
        </div>
      ) : (
        <TopicQuizList topicSlug={params.slug} quizzes={quizzes} />
      )}
    </div>
  );
}
