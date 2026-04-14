"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

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

function QuizCard({
  q,
  topicSlug,
  index,
}: {
  q: QuizItem;
  topicSlug: string;
  index: number;
}) {
  return (
    <motion.div
      key={q.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: index * 0.04 }}
    >
      <Link
        href={`/topics/${topicSlug}/quiz/${q.id}`}
        className={`group flex items-center gap-3 rounded-2xl border p-4 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md active:scale-[0.98] ${
          q.completed
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60"
        }`}
      >
        {/* Quiz number badge */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
            q.completed
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-accent/10 text-accent"
          }`}
        >
          {q.completed ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            q.quizNumber
          )}
        </div>

        {/* Title & meta */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {q.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {q.questionCount} questions
            {q.completed && q.bestPercentage != null && (
              <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
                · {Math.round(q.bestPercentage)}% · {q.bestScore} pts
              </span>
            )}
          </p>
        </div>

        {/* Action */}
        <span
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-transform duration-150 ease-out group-hover:translate-x-0.5 ${
            q.completed
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-accent/10 text-accent"
          }`}
        >
          {q.completed ? "Retry →" : "Play →"}
        </span>
      </Link>
    </motion.div>
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
    <div className="space-y-8">
      {/* Available quizzes */}
      {available.length > 0 && (
        <section>
          {completed.length > 0 && (
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Available
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((q, i) => (
              <QuizCard key={q.id} q={q} topicSlug={topicSlug} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Completed quizzes */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Completed
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completed.map((q, i) => (
              <QuizCard
                key={q.id}
                q={q}
                topicSlug={topicSlug}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* All completed state */}
      {available.length === 0 && completed.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-6 py-4 text-center dark:border-emerald-800 dark:bg-emerald-950/20">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            You completed all quizzes in this topic! Retry any to improve your score.
          </p>
        </div>
      )}
    </div>
  );
}
