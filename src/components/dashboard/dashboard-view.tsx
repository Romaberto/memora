"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GenerationProgress } from "@/components/ui/generation-progress";
import { QUESTION_COUNTS, type QuestionCount } from "@/lib/schemas/quiz";
import { formatDateTimeStable } from "@/lib/format-date";
import { formatDurationHuman } from "@/lib/format-quiz-clock";
import { DailyProgressDashboard } from "@/components/dashboard/daily-progress-dashboard";
import type { SessionForDaily } from "@/lib/daily-progress";
import { recordQuizGenerationSeconds } from "@/lib/quiz-generation-timing";
import { UserAvatar } from "@/components/user-avatar";
import type { LeaderboardEntry } from "@/lib/leaderboard";

// ─── icons ───────────────────────────────────────────────────────────────────

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ─── stat pill — glanceable hero numbers ─────────────────────────────────────

function StatPill({
  label,
  value,
  accent = false,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  size?: "md" | "lg";
}) {
  const isLarge = size === "lg";
  return (
    <div
      className={`flex flex-col rounded-xl border px-3 py-2.5 ${
        isLarge ? "min-w-[104px]" : "min-w-[84px]"
      } ${
        accent
          ? "border-accent/40 bg-gradient-to-br from-accent/[0.10] to-accent/[0.02]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--background))]"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span
        className={`mt-1 font-extrabold tabular-nums leading-none ${
          isLarge ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        } ${accent ? "text-accent" : "text-[rgb(var(--foreground))]"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

export type DashboardRequestRow = {
  id: string;
  topic: string;
  title: string | null;
  summaryText: string;
  notes: string | null;
  questionCount: number;
  createdAt: string;
};

export type DashboardSessionRow = {
  id: string;
  topic: string;
  score: number;
  percentage: number;
  rankName: string;
  questionCount: number;
  createdAt: string;
  durationSeconds?: number | null;
};

type Props = {
  userName: string | null;
  requests: DashboardRequestRow[];
  sessions: DashboardSessionRow[];
  dailyProgressSessions: SessionForDaily[];
  subscriptionTier: "free" | "pro";
  dailyQuizCount: number;
  dailyQuizLimit: number;
  stats: {
    totalSessions: number;
    avgPercentage: number | null;
    sessionsLast7Days: number;
    overallRank: string | null;
    avgSecondsPerQuestion: number | null;
    estimatedTenQuestionSeconds: number | null;
  };
  leaderboard: {
    entries: LeaderboardEntry[];
    userRank: number;   // 1-based, 0 = not on board
    totalPlayers: number;
  };
};

// ─── component ────────────────────────────────────────────────────────────────

function medalEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export function DashboardView({
  userName,
  requests,
  sessions,
  dailyProgressSessions,
  subscriptionTier,
  dailyQuizCount,
  dailyQuizLimit,
  stats,
  leaderboard,
}: Props) {
  const router = useRouter();

  // form state
  const [title, setTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [notes, setNotes] = useState("");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [showNotes, setShowNotes] = useState(false);

  // Collapse the full generator for returning users — we expand when the user
  // hits the "+ New quiz" trigger or prefills from history.
  const hasHistory = sessions.length > 0 || requests.length > 0;
  const [formExpanded, setFormExpanded] = useState<boolean>(!hasHistory);

  // open notes panel automatically when prefill sets a value
  useEffect(() => {
    if (notes.length > 0) setShowNotes(true);
  }, [notes]);

  // generate state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState(false);
  const [debugPayload, setDebugPayload] = useState<string | null>(null);

  // history state — row-level undo (5s window before DELETE fires)
  const [pendingRemovals, setPendingRemovals] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [historyError, setHistoryError] = useState<string | null>(null);

  // cancel any pending timeouts if the component unmounts
  useEffect(() => {
    return () => {
      pendingRemovals.forEach((t) => window.clearTimeout(t));
    };
    // only runs on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDebug = process.env.NODE_ENV === "development";
  const generateStartedMs = useRef<number>(0);

  // ── handlers ──────────────────────────────────────────────────────────────

  async function finalizeRemoval(id: string) {
    setPendingRemovals((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
    try {
      const res = await fetch(`/api/quiz-request/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setHistoryError("Could not remove that quiz. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setHistoryError("Network error while removing the quiz.");
    }
  }

  function queueRemoval(id: string) {
    if (pendingRemovals.has(id)) return;
    setHistoryError(null);
    const timeoutId = window.setTimeout(() => void finalizeRemoval(id), 5000);
    setPendingRemovals((m) => {
      const next = new Map(m);
      next.set(id, timeoutId);
      return next;
    });
  }

  function undoRemoval(id: string) {
    const t = pendingRemovals.get(id);
    if (t != null) window.clearTimeout(t);
    setPendingRemovals((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugPayload(null);
    try {
      generateStartedMs.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          summaryText,
          notes: notes.trim() || null,
          questionCount,
          debugIncludePrompt: showDebug && debugPrompt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not generate a quiz. Try again.",
        );
        return;
      }
      if (showDebug && debugPrompt && data.debugPrompt) {
        setDebugPayload(JSON.stringify(data.debugPrompt, null, 2));
      }
      if (typeof data.quizRequestId === "string") {
        const endMs =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsedSec = (endMs - generateStartedMs.current) / 1000;
        recordQuizGenerationSeconds(questionCount, elapsedSec);

        const q = new URLSearchParams();
        if (data.usedFallback) {
          q.set("fallback", "1");
          if (typeof data.fallbackReason === "string") {
            q.set("reason", data.fallbackReason);
          }
        }
        const suffix = q.toString() ? `?${q.toString()}` : "";
        router.push(`/dashboard/quiz/${data.quizRequestId}${suffix}`);
        router.refresh();
      }
    } catch {
      setError("Network error. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">

      {/* ── Page header + compact stat strip ──────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Turn your notes into retrieval practice.
          </p>
        </div>

        {/* Stat pills — glanceable hero numbers, right-aligned on desktop */}
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatPill
            label="Rank"
            value={stats.overallRank ?? "—"}
            accent={!!stats.overallRank}
            size="lg"
          />
          <StatPill
            label="Avg score"
            value={
              stats.avgPercentage != null
                ? `${Math.round(stats.avgPercentage)}%`
                : "—"
            }
          />
          <StatPill label="Quizzes" value={stats.totalSessions} />
          <StatPill label="This week" value={stats.sessionsLast7Days} />
        </div>
      </div>

      {/* ── Generate quiz — hero card ──────────────────────────────────── */}
      <Card className="border-accent/40 bg-gradient-to-br from-accent/[0.06] via-transparent to-transparent dark:border-accent/50 dark:from-accent/[0.10]">
        {!formExpanded ? (
          // ── Collapsed state — returning users: quick-entry trigger ────
          <button
            type="button"
            onClick={() => setFormExpanded(true)}
            className="group flex w-full items-center justify-between gap-4 rounded-xl px-1 py-3 text-left outline-none transition-[transform] duration-150 ease-out active:scale-[0.99]"
            aria-expanded={false}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Generate a quiz
              </p>
              <p className="mt-1 text-base font-bold text-[rgb(var(--foreground))] sm:text-lg">
                Drop in something new to remember →
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {subscriptionTier === "free"
                  ? `${dailyQuizCount}/${dailyQuizLimit} free quizzes today`
                  : "Unlimited generations."}
              </p>
            </div>
            <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-transform duration-150 ease-out group-hover:bg-emerald-600 group-active:scale-[0.97]">
              <PlusIcon />
              New quiz
            </span>
          </button>
        ) : (
          <>
            {/* Card header — expanded */}
            <div className="mb-5 flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Generate a quiz
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Paste your notes or a summary — we&apos;ll turn them into questions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {showDebug && (
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={debugPrompt}
                      onChange={(e) => setDebugPrompt(e.target.checked)}
                    />
                    Debug prompt
                  </label>
                )}
                {hasHistory && !loading && (
                  <button
                    type="button"
                    onClick={() => setFormExpanded(false)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 underline transition-colors duration-150 ease-out hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Collapse generator"
                  >
                    Collapse
                  </button>
                )}
              </div>
            </div>

        <form className="space-y-4" onSubmit={onGenerate}>
          {/* Title + question count in one row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="title"
                className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100"
              >
                Book / article / topic title
              </label>
              <input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Thinking, Fast and Slow" — chapters 1–3'
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base outline-none ring-accent/30 transition-[border-color,box-shadow] duration-150 ease-out focus:ring-2 dark:border-slate-700 dark:bg-slate-900 sm:text-sm"
              />
            </div>
            <div className="shrink-0">
              <label
                htmlFor="count"
                className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100"
              >
                Questions
              </label>
              <div className="relative">
                <select
                  id="count"
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(Number(e.target.value) as QuestionCount)
                  }
                  className="h-[46px] w-full appearance-none rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 pr-8 text-base text-[rgb(var(--foreground))] outline-none ring-accent/30 focus:border-accent focus:ring-2 sm:h-[42px] sm:text-sm"
                >
                  {QUESTION_COUNTS.map((n) => {
                    const locked = subscriptionTier === "free" && n > 10;
                    return (
                      <option key={n} value={n} disabled={locked}>
                        {n}{locked ? " — Pro" : ""}
                      </option>
                    );
                  })}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {/* Summary — primary large input */}
          <div>
            <label
              htmlFor="summary"
              className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              Summary / key points
              <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                (main input)
              </span>
            </label>
            <textarea
              id="summary"
              name="summary"
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              rows={7}
              placeholder="Paste a book chapter, lecture notes, bullet points, or any material you want to quiz yourself on…"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-accent/30 transition-[border-color,box-shadow] duration-150 ease-out focus:ring-2 dark:border-slate-700 dark:bg-slate-900 sm:text-sm"
            />
          </div>

          {/* Optional notes — collapsed by default */}
          {showNotes ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="notes"
                  className="text-sm font-medium text-slate-800 dark:text-slate-100"
                >
                  Optional notes
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false);
                    setNotes("");
                  }}
                  className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Remove
                </button>
              </div>
              <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional context or ideas to focus on during the quiz"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-accent/30 transition-[border-color,box-shadow] duration-150 ease-out focus:ring-2 dark:border-slate-700 dark:bg-slate-900 sm:text-sm"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <PlusIcon />
              Add optional notes
            </button>
          )}

          {/* Error */}
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {error}
            </div>
          ) : null}

          {/* Generation progress */}
          {loading ? (
            <GenerationProgress
              message="Generating your quiz…"
              questionCount={questionCount}
              className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40"
            />
          ) : null}

          {/* Debug payload */}
          {debugPayload ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Prompt bundle (dev)
              </p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
                {debugPayload}
              </pre>
              <Button
                type="button"
                variant="outline"
                className="!text-xs"
                onClick={() =>
                  void navigator.clipboard.writeText(debugPayload)
                }
              >
                Copy prompt JSON
              </Button>
            </div>
          ) : null}

          {/* Daily limit indicator for free users */}
          {subscriptionTier === "free" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[rgb(var(--muted))]">
                {dailyQuizCount}/{dailyQuizLimit} free quizzes today
              </span>
              {dailyQuizCount >= dailyQuizLimit && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  Limit reached
                </span>
              )}
            </div>
          )}

          {/* CTA — full-width, prominent */}
          <Button
            type="submit"
            disabled={loading || (subscriptionTier === "free" && dailyQuizCount >= dailyQuizLimit)}
            className="w-full sm:w-auto sm:px-8"
          >
            {subscriptionTier === "free" && dailyQuizCount >= dailyQuizLimit
              ? "Daily limit reached"
              : loading ? "Generating…" : "Generate quiz →"}
          </Button>
        </form>
          </>
        )}
      </Card>

      {/* ── Daily progress ─────────────────────────────────────────────── */}
      <DailyProgressDashboard
        sessions={dailyProgressSessions}
        subscriptionTier={subscriptionTier}
      />

      {/* ── Mini leaderboard ───────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Leaderboard</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              {leaderboard.userRank > 0
                ? `You're ranked ${medalEmoji(leaderboard.userRank)} out of ${leaderboard.totalPlayers} player${leaderboard.totalPlayers !== 1 ? "s" : ""}.`
                : "Complete a quiz to appear on the board."}
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="shrink-0 text-xs font-medium text-accent underline transition-opacity duration-150 ease-out hover:opacity-80"
          >
            Full leaderboard →
          </Link>
        </div>

        {leaderboard.entries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No scores yet. Be the first to complete a quiz!
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {leaderboard.entries.slice(0, 5).map((e) => (
              <li
                key={e.userId}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  leaderboard.userRank > 0 && leaderboard.entries[leaderboard.userRank - 1]?.userId === e.userId
                    ? "bg-accent/[0.07] dark:bg-accent/[0.12]"
                    : "bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <span className={`w-7 text-center text-sm font-bold tabular-nums ${e.rank <= 3 ? "text-base" : "text-slate-500"}`}>
                  {medalEmoji(e.rank)}
                </span>
                <UserAvatar src={e.avatarUrl || null} name={e.displayName} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">
                  {e.displayName}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {e.totalPoints.toLocaleString()}
                  <span className="ml-0.5 text-xs font-normal text-slate-400"> pts</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── History grid ───────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saved topics — quiz requests you created */}
        <Card>
          <CardTitle>Saved topics</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Topics you can retry or reuse.
          </p>
          {historyError ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {historyError}
            </div>
          ) : null}
          <ul className="mt-4 space-y-3">
            {requests.length === 0 ? (
              <li className="text-sm text-slate-500">
                No topics yet. Generate your first quiz to see it here.
              </li>
            ) : (
              requests.map((r) => {
                const isPending = pendingRemovals.has(r.id);
                return (
                  <li
                    key={r.id}
                    className={`flex flex-col gap-2 rounded-xl border border-slate-200/80 p-3 transition-opacity duration-200 ease-out dark:border-slate-700 ${
                      isPending ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{r.topic}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTimeStable(r.createdAt)} · {r.questionCount} Q
                          {isPending ? " · removing…" : ""}
                        </p>
                      </div>
                      {isPending ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent underline outline-none ring-accent/30 transition-colors duration-150 ease-out hover:bg-accent/10 focus-visible:ring-2"
                          aria-label={`Undo remove: ${r.topic}`}
                          onClick={() => undoRemoval(r.id)}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="-m-1.5 shrink-0 rounded-lg p-2.5 text-slate-400 outline-none ring-accent/30 transition-colors duration-150 ease-out hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          aria-label={`Remove quiz from history: ${r.topic}`}
                          onClick={() => queueRemoval(r.id)}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/quiz/${r.id}`}>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1.5 !text-xs"
                          disabled={isPending}
                        >
                          Start quiz
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        className="!py-1.5 !text-xs"
                        disabled={isPending}
                        onClick={() => {
                          setTitle(r.title ?? "");
                          setSummaryText(r.summaryText ?? "");
                          setNotes(r.notes ?? "");
                          setQuestionCount(r.questionCount as QuestionCount);
                          setFormExpanded(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Prefill form
                      </Button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        {/* Recent runs — completed quizzes */}
        <Card>
          <CardTitle>Recent runs</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Score, rank, and time per completed run.
          </p>
          <ul className="mt-4 space-y-3">
            {sessions.length === 0 ? (
              <li className="text-sm text-slate-500">
                Complete a quiz to build your history here.
              </li>
            ) : (
              sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.topic}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTimeStable(s.createdAt)} ·{" "}
                      {Math.round(s.percentage)}% · {s.rankName} ·{" "}
                      {s.questionCount} Q
                      {s.durationSeconds != null && s.durationSeconds > 0
                        ? ` · ${formatDurationHuman(s.durationSeconds)}`
                        : ""}
                    </p>
                  </div>
                  <Link href={`/dashboard/session/${s.id}`} className="shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="!py-1.5 !text-xs"
                    >
                      Review
                    </Button>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
