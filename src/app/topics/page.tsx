import { getTopics } from "@/lib/topics";
import { TopicGrid } from "@/components/topics/topic-grid";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:hover:text-white"
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pick a topic and test your knowledge with pre-made quizzes.
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            No topics yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Topics are being generated. Check back soon!
          </p>
        </div>
      ) : (
        <TopicGrid topics={topics} />
      )}
    </div>
  );
}
