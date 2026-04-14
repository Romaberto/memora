"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getTopicColors } from "@/lib/topic-colors";
import type { RecommendedQuiz } from "@/lib/topics";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Dashboard recommendations block.
 *
 * Layout: hero on top (full width, compact natural height), three alternates
 * in a 3-column row below. Hero is NOT stretched to match a tall right column
 * — that was the empty-space problem in the previous revision.
 */
export function RecommendedQuizzes({ quizzes }: { quizzes: RecommendedQuiz[] }) {
  if (quizzes.length === 0) return null;

  const [hero, ...rest] = quizzes;
  const alts = rest.slice(0, 3);

  return (
    <section aria-label="Recommended quizzes">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Picked for you
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Based on the topics you chose during sign-up.
          </p>
        </div>
        <Link
          href="/topics"
          className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 ease-out hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          Browse all →
        </Link>
      </div>

      <div className="mt-3 space-y-3">
        {hero && <HeroCard quiz={hero} />}
        {alts.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alts.map((q, i) => (
              <AltCard key={q.id} quiz={q} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Hero card ──────────────────────────────────────────────────────────────

function HeroCard({ quiz }: { quiz: RecommendedQuiz }) {
  const colors = getTopicColors(quiz.topic.color);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <Link
        href={`/topics/${quiz.topic.slug}/quiz/${quiz.id}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/60"
      >
        {/* accent stripe — the only place topic color lives at card level */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${colors.bg.split(" ")[0]}`}
        />

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl ${colors.bg}`}
        >
          {quiz.topic.icon ?? "✨"}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
            Next up · {quiz.topic.name}
          </p>
          <p className="mt-0.5 text-lg font-bold leading-snug text-slate-900 dark:text-white">
            {quiz.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {quiz.questionCount} questions · Quiz #{quiz.quizNumber}
          </p>
        </div>

        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,background-color] duration-150 ease-out group-hover:bg-emerald-600 group-hover:translate-x-0.5">
          Play →
        </span>
      </Link>
    </motion.div>
  );
}

// ── Alternate card (compact) ───────────────────────────────────────────────

function AltCard({ quiz, index }: { quiz: RecommendedQuiz; index: number }) {
  const colors = getTopicColors(quiz.topic.color);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 + index * 0.04 }}
      className="h-full"
    >
      <Link
        href={`/topics/${quiz.topic.slug}/quiz/${quiz.id}`}
        className="group relative flex h-full flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/60"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${colors.bg}`}
          >
            {quiz.topic.icon ?? "✨"}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>
              {quiz.topic.name}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
              {quiz.title}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {quiz.questionCount} questions
          </p>
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-[transform,background-color] duration-150 ease-out group-hover:bg-accent group-hover:text-white group-hover:translate-x-0.5 dark:bg-slate-800 dark:text-slate-200">
            Play →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
