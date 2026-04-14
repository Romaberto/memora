"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TopicWithCount } from "@/lib/topics";
import { getTopicColors } from "@/lib/topic-colors";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function TopicGrid({ topics }: { topics: TopicWithCount[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic, i) => {
        const c = getTopicColors(topic.color);
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
