"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UpgradeModal } from "@/components/pricing/upgrade-modal";
import { getTier, type TierId } from "@/lib/tiers";
import type { RelatedTopicSuggestion } from "@/lib/related-topics";

type RelatedTopicsState =
  | { status: "loading"; topics: RelatedTopicSuggestion[] }
  | { status: "ready"; topics: RelatedTopicSuggestion[] }
  | { status: "error"; topics: RelatedTopicSuggestion[] };

export function RelatedTopicsCard({
  sessionId,
  subscriptionTier,
}: {
  sessionId: string;
  subscriptionTier: TierId;
}) {
  const [state, setState] = useState<RelatedTopicsState>({
    status: "loading",
    topics: [],
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const canCreateCustomQuiz = getTier(subscriptionTier).canCustomQuiz;
  const cacheKey = useMemo(
    () => `memora:related-topics:${sessionId}`,
    [sessionId],
  );

  useEffect(() => {
    let cancelled = false;

    function readCached(): RelatedTopicSuggestion[] | null {
      try {
        const raw = window.sessionStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        const topics = parsed.filter(isRelatedTopic).slice(0, 5);
        return topics.length > 0 ? topics : null;
      } catch {
        return null;
      }
    }

    const cached = readCached();
    if (cached) {
      setState({ status: "ready", topics: cached });
      return;
    }

    async function load() {
      setState({ status: "loading", topics: [] });
      try {
        const res = await fetch(
          `/api/dashboard/session/${encodeURIComponent(sessionId)}/related-topics`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.topics)) {
          throw new Error("Could not load related topics");
        }
        const topics = data.topics.filter(isRelatedTopic).slice(0, 5);
        if (topics.length === 0) throw new Error("No related topics");
        if (!cancelled) {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(topics));
          setState({ status: "ready", topics });
        }
      } catch {
        if (!cancelled) setState({ status: "error", topics: [] });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, sessionId]);

  const primary = state.topics[0] ?? null;
  const alternates = state.topics.slice(1, 5);
  const isLoading = state.status === "loading";

  return (
    <section
      aria-label="Suggested next topics"
      className="rounded-xl border border-[rgb(var(--accent)/0.18)] bg-gradient-to-br from-[rgb(var(--accent)/0.07)] via-white to-white p-5 shadow-[0_1px_2px_rgba(26,26,32,0.04)] sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-ink))]">
            {isLoading ? "Preparing next steps" : "Keep going"}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
            {isLoading
              ? "Finding topics worth studying next."
              : "Turn the next idea into a quiz."}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[rgb(var(--muted))]">
            {isLoading
              ? "We are reading this result and preparing quiz suggestions."
              : "Based on this session, these topics are good next steps."}
          </p>
        </div>

        {isLoading ? (
          <span
            role="status"
            className="inline-flex self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-[rgb(var(--accent-ink))] ring-1 ring-[rgb(var(--accent)/0.18)]"
          >
            Preparing...
          </span>
        ) : !canCreateCustomQuiz ? (
          <span className="inline-flex self-start rounded-full bg-[rgb(var(--accent)/0.12)] px-3 py-1 text-xs font-semibold text-[rgb(var(--accent-ink))]">
            Custom quizzes unlock this
          </span>
        ) : null}
      </div>

      {state.status === "loading" && <RelatedTopicsLoading />}

      {state.status === "error" && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-[rgb(var(--muted))]">
          Could not load topic suggestions right now. You can still start a
          new quiz from the dashboard.
        </div>
      )}

      {primary && (
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-xl border border-[rgb(var(--accent)/0.24)] bg-white p-4 shadow-[0_1px_2px_rgba(26,26,32,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-ink))]">
              Recommended next
            </p>
            <h3 className="mt-2 text-xl font-bold leading-tight text-[rgb(var(--foreground))]">
              {primary.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">
              {primary.angle}
            </p>
            <div className="mt-4">
              <TopicAction
                topic={primary.title}
                canCreateCustomQuiz={canCreateCustomQuiz}
                onUpgrade={() => setUpgradeOpen(true)}
                primary
              />
            </div>
          </div>

          <div className="grid gap-2">
            {alternates.map((topic) => (
              <div
                key={topic.title}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-[rgb(var(--foreground))]">
                    {topic.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                    {topic.angle}
                  </p>
                </div>
                <TopicAction
                  topic={topic.title}
                  canCreateCustomQuiz={canCreateCustomQuiz}
                  onUpgrade={() => setUpgradeOpen(true)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentTier={subscriptionTier}
        reason="custom_quiz"
      />
    </section>
  );
}

function TopicAction({
  topic,
  canCreateCustomQuiz,
  onUpgrade,
  primary = false,
}: {
  topic: string;
  canCreateCustomQuiz: boolean;
  onUpgrade: () => void;
  primary?: boolean;
}) {
  const className = primary
    ? "inline-flex h-10 items-center justify-center rounded-xl bg-[rgb(var(--accent))] px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-[rgb(var(--accent-ink))] active:scale-[0.98]"
    : "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-white px-3 text-xs font-semibold text-[rgb(var(--foreground))] transition-[border-color,background-color,transform] duration-150 ease-out hover:border-[rgb(var(--accent)/0.28)] hover:bg-[rgb(var(--accent)/0.08)] active:scale-[0.98]";

  if (!canCreateCustomQuiz) {
    return (
      <button type="button" onClick={onUpgrade} className={className}>
        {primary ? "Upgrade to create quiz" : "Unlock"}
      </button>
    );
  }

  return (
    <Link
      href={`/dashboard?customTopic=${encodeURIComponent(topic)}`}
      className={className}
    >
      {primary ? "Create quiz" : "Create"}
    </Link>
  );
}

function RelatedTopicsLoading() {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="rounded-xl border border-[rgb(var(--accent)/0.18)] bg-white p-4 shadow-[0_1px_2px_rgba(26,26,32,0.04)]">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[rgb(var(--accent)/0.16)]" />
        <div className="mt-5 h-6 w-3/4 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-6 inline-flex h-10 w-44 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.14)] px-4 text-sm font-semibold text-[rgb(var(--accent-ink))]">
          Preparing quiz ideas
        </div>
      </div>
      <div className="grid gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function isRelatedTopic(value: unknown): value is RelatedTopicSuggestion {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<RelatedTopicSuggestion>;
  return typeof maybe.title === "string" && typeof maybe.angle === "string";
}
