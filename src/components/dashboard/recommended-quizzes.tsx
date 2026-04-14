import Link from "next/link";
import { getTopicColors } from "@/lib/topic-colors";
import type { RecommendedQuiz } from "@/lib/topics";

/**
 * Dashboard recommendations block.
 *
 * Hero on top (full-width, compact natural height), three alternates in
 * a 3-col row below. Emoji icons on colored pastel tiles — the same
 * visual language the landing page uses for its step circles and the
 * "How it works" numbered badges. No framer-motion stagger on this
 * dashboard surface (high-frequency → the animation was latency, not
 * delight).
 */
export function RecommendedQuizzes({ quizzes }: { quizzes: RecommendedQuiz[] }) {
  if (quizzes.length === 0) return null;

  const [hero, ...rest] = quizzes;
  const alts = rest.slice(0, 3);

  return (
    <section aria-label="Recommended quizzes">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-xl">
            Picked for you
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Based on the topics you chose.
          </p>
        </div>
        <Link
          href="/topics"
          className="shrink-0 text-sm font-medium text-accent transition-colors duration-150 ease-[var(--ease-out)] hover:text-[rgb(var(--accent-ink))]"
        >
          Browse all →
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {hero && <HeroCard quiz={hero} />}
        {alts.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alts.map((q) => (
              <AltCard key={q.id} quiz={q} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Hero card ──────────────────────────────────────────────────────────────

function HeroCard({ quiz }: { quiz: RecommendedQuiz }) {
  const tile = getTopicColors(quiz.topic.color);
  return (
    <Link
      href={`/topics/${quiz.topic.slug}/quiz/${quiz.id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[0_2px_8px_rgba(26,26,32,0.08)] active:scale-[0.995]"
    >
      {/* Accent stripe — the only place the topic color lives at card level */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${tile.bg}`}
      />

      <div
        aria-hidden
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl ${tile.bg}`}
      >
        {quiz.topic.icon ?? "✨"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
          Next up · {quiz.topic.name}
        </p>
        <h3 className="mt-0.5 text-lg font-bold leading-snug tracking-tight text-[rgb(var(--foreground))] sm:text-xl">
          {quiz.title}
        </h3>
        <p className="mt-1 text-xs text-[rgb(var(--muted))]">
          {quiz.questionCount} questions · Quiz #{quiz.quizNumber}
        </p>
      </div>

      <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color] duration-150 ease-[var(--ease-out)] group-hover:bg-[rgb(var(--accent-ink))] sm:inline-flex">
        Play →
      </span>
    </Link>
  );
}

// ── Alternate card (compact) ───────────────────────────────────────────────

function AltCard({ quiz }: { quiz: RecommendedQuiz }) {
  const tile = getTopicColors(quiz.topic.color);
  return (
    <Link
      href={`/topics/${quiz.topic.slug}/quiz/${quiz.id}`}
      className="group relative flex h-full flex-col justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[0_2px_8px_rgba(26,26,32,0.08)] active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${tile.bg}`}
        >
          {quiz.topic.icon ?? "✨"}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${tile.text}`}>
            {quiz.topic.name}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold leading-snug text-[rgb(var(--foreground))]">
            {quiz.title}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[rgb(var(--muted))]">
          {quiz.questionCount} questions
        </p>
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors duration-150 ease-[var(--ease-out)] group-hover:bg-accent group-hover:text-white">
          Play →
        </span>
      </div>
    </Link>
  );
}
