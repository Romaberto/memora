import Link from "next/link";
import type { TopicWithCount } from "@/lib/topics";
import { getTopicColors } from "@/lib/topic-colors";

/**
 * Topic grid.
 *
 * We briefly tried two-letter monograms on neutral tiles for a "library
 * index" feel. Product pushback: hard to scan, felt academic. Back to
 * emoji-on-pastel, which matches the landing page's colorful convention
 * and is much easier to pattern-match visually.
 *
 * No stagger — /topics is revisited often, animation would just be latency.
 */
export function TopicGrid({ topics }: { topics: TopicWithCount[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => {
        const tile = getTopicColors(topic.color);
        return (
          <Link
            key={topic.id}
            href={`/topics/${topic.slug}`}
            className="group flex h-full gap-4 rounded-xl border border-[rgb(var(--border))] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[0_2px_8px_rgba(26,26,32,0.08)] active:scale-[0.99]"
          >
            <div
              aria-hidden
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl ${tile.bg}`}
            >
              {topic.icon ?? "✨"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold leading-tight tracking-tight text-[rgb(var(--foreground))]">
                {topic.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[rgb(var(--muted))]">
                {topic.description}
              </p>
              <p className="mt-3 text-xs text-[rgb(var(--muted))]">
                {topic.quizCount}{" "}
                {topic.quizCount === 1 ? "quiz" : "quizzes"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
