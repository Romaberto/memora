import Link from "next/link";

/**
 * Quiz list within a topic.
 *
 * Completed quizzes get an emerald accent treatment — matches the
 * landing-page convention where accent = success / forward motion.
 * Numbered badges live in accent-tinted pills, not serif numerals —
 * the editorial numerals test failed a scan check.
 */

type QuizItem = {
  id: string;
  title: string;
  quizNumber: number;
  difficulty: string;
  questionCount: number;
  completed: boolean;
  bestScore: number | null;
  bestPercentage: number | null;
  bestRank: string | null;
};

function QuizCard({ q, topicSlug }: { q: QuizItem; topicSlug: string }) {
  return (
    <Link
      href={`/topics/${topicSlug}/quiz/${q.id}`}
      className={`group flex items-center gap-4 rounded-xl border p-4 shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[0_2px_8px_rgba(26,26,32,0.08)] active:scale-[0.99] ${
        q.completed
          ? "border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.04)]"
          : "border-[rgb(var(--border))] bg-white"
      }`}
    >
      {/* Number badge — accent pill for completed, neutral for fresh */}
      <div
        aria-hidden
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${
          q.completed
            ? "bg-[rgb(var(--accent))] text-white"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {q.completed ? "✓" : q.quizNumber}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-[rgb(var(--foreground))] sm:text-base">
          {q.title}
        </h3>
        <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
          {q.questionCount} questions
          {q.completed && q.bestPercentage != null && (
            <>
              <span className="px-1.5">·</span>
              <span className="font-medium text-[rgb(var(--accent-ink))]">
                {Math.round(q.bestPercentage)}% · {q.bestScore} pts
              </span>
            </>
          )}
        </p>
      </div>

      <svg
        className="h-4 w-4 shrink-0 text-[rgb(var(--muted))] transition-colors duration-150 ease-[var(--ease-out)] group-hover:text-[rgb(var(--accent))]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export function TopicQuizList({
  topicSlug,
  quizzes,
}: {
  topicSlug: string;
  quizzes: QuizItem[];
}) {
  const available = quizzes.filter((q) => !q.completed);
  const completed = quizzes.filter((q) => q.completed);

  return (
    <div className="space-y-10">
      {available.length > 0 && (
        <section>
          {completed.length > 0 && (
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
              Up next
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((q) => (
              <QuizCard key={q.id} q={q} topicSlug={topicSlug} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-ink))]">
            Completed
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completed.map((q) => (
              <QuizCard key={q.id} q={q} topicSlug={topicSlug} />
            ))}
          </div>
        </section>
      )}

      {available.length === 0 && completed.length > 0 && (
        <p className="text-sm text-[rgb(var(--muted))]">
          You’ve played every quiz in this topic. Replay any to beat your score.
        </p>
      )}
    </div>
  );
}
