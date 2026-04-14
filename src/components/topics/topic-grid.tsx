"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TopicWithCount } from "@/lib/topics";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Map color hints to tailwind classes
const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-800",    text: "text-rose-600 dark:text-rose-400" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/30",   border: "border-purple-200 dark:border-purple-800", text: "text-purple-600 dark:text-purple-400" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800",    text: "text-blue-600 dark:text-blue-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800",  text: "text-amber-600 dark:text-amber-400" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/30",       border: "border-teal-200 dark:border-teal-800",    text: "text-teal-600 dark:text-teal-400" },
  green:   { bg: "bg-green-50 dark:bg-green-950/30",     border: "border-green-200 dark:border-green-800",  text: "text-green-600 dark:text-green-400" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-950/30",   border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-600 dark:text-yellow-400" },
  slate:   { bg: "bg-slate-50 dark:bg-slate-800/40",     border: "border-slate-200 dark:border-slate-700",  text: "text-slate-600 dark:text-slate-400" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/30",   border: "border-violet-200 dark:border-violet-800", text: "text-violet-600 dark:text-violet-400" },
  lime:    { bg: "bg-lime-50 dark:bg-lime-950/30",       border: "border-lime-200 dark:border-lime-800",    text: "text-lime-600 dark:text-lime-400" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/30",   border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-600 dark:text-indigo-400" },
  pink:    { bg: "bg-pink-50 dark:bg-pink-950/30",       border: "border-pink-200 dark:border-pink-800",    text: "text-pink-600 dark:text-pink-400" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/30",       border: "border-cyan-200 dark:border-cyan-800",    text: "text-cyan-600 dark:text-cyan-400" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/30",         border: "border-sky-200 dark:border-sky-800",      text: "text-sky-600 dark:text-sky-400" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-orange-200 dark:border-orange-800", text: "text-orange-600 dark:text-orange-400" },
  fuchsia: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-200 dark:border-fuchsia-800", text: "text-fuchsia-600 dark:text-fuchsia-400" },
  stone:   { bg: "bg-stone-50 dark:bg-stone-800/40",     border: "border-stone-200 dark:border-stone-700",  text: "text-stone-600 dark:text-stone-400" },
  red:     { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-200 dark:border-red-800",      text: "text-red-600 dark:text-red-400" },
};

const DEFAULT_COLORS = COLOR_MAP.slate!;

function getColors(color: string | null) {
  return COLOR_MAP[color ?? ""] ?? DEFAULT_COLORS;
}

export function TopicGrid({ topics }: { topics: TopicWithCount[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic, i) => {
        const c = getColors(topic.color);
        return (
          <motion.div
            key={topic.id}
            className="h-full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(i * 0.04, 0.4) }}
          >
            <Link
              href={`/topics/${topic.slug}`}
              className={`group flex h-full flex-col rounded-2xl border p-5 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md active:scale-[0.98] ${c.bg} ${c.border}`}
            >
              <span className="text-3xl">{topic.icon}</span>
              <h3 className={`mt-2 text-base font-bold ${c.text}`}>{topic.name}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">
                {topic.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {topic.quizCount} {topic.quizCount === 1 ? "quiz" : "quizzes"}
                </span>
                <span className={`text-xs font-semibold ${c.text} transition-transform duration-150 ease-out group-hover:translate-x-0.5`}>
                  Explore →
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
