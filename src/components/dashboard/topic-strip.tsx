"use client";

import Link from "next/link";

type TopicChip = {
  slug: string;
  name: string;
  icon: string | null;
  quizCount: number;
};

export function TopicStrip({ topics }: { topics: TopicChip[] }) {
  if (topics.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Topics
        </h2>
        <Link
          href="/topics"
          className="text-xs font-medium text-accent transition-colors duration-150 ease-out hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          View all →
        </Link>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/topics/${t.slug}`}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-[box-shadow,transform] duration-150 ease-out hover:shadow-sm active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900/60"
          >
            {t.icon && <span className="text-base">{t.icon}</span>}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {t.name}
            </span>
            <span className="text-xs text-slate-400">{t.quizCount}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
