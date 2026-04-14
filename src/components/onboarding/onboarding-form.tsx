"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { TopicWithCount } from "@/lib/topics";
import { getTopicColors } from "@/lib/topic-colors";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const MIN_SELECTIONS = 3;

export function OnboardingForm({ topics }: { topics: TopicWithCount[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleContinue() {
    if (selected.size < MIN_SELECTIONS) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          What interests you?
        </h1>
        <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
          Pick {MIN_SELECTIONS} or more topics to personalize your experience
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, i) => {
          const c = getTopicColors(topic.color);
          const isSelected = selected.has(topic.id);
          return (
            <motion.button
              key={topic.id}
              type="button"
              onClick={() => toggle(topic.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(i * 0.03, 0.5) }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200 ease-out ${c.bg} ${c.border} ${
                isSelected
                  ? `ring-2 ${c.ring} shadow-md`
                  : "hover:shadow-sm"
              }`}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              <span className="text-2xl">{topic.icon}</span>
              <h3 className={`mt-1.5 text-sm font-bold ${c.text}`}>{topic.name}</h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {topic.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selected.size} of {topics.length} selected
            {selected.size < MIN_SELECTIONS && (
              <span className="ml-1 text-slate-400">
                (pick {MIN_SELECTIONS - selected.size} more)
              </span>
            )}
          </span>

          <button
            type="button"
            disabled={selected.size < MIN_SELECTIONS || loading}
            onClick={() => void handleContinue()}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 ease-out hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>

        {error && (
          <div className="mx-auto max-w-3xl px-4 pb-2">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
