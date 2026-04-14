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
import { getLeague, getNextLeague, leagueProgress, LEAGUES } from "@/lib/leagues";
import type { League } from "@/lib/leagues";

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

// ─── league pill — shows current league with icon + progress ────────────────

function LeaguePill({ totalPoints }: { totalPoints: number }) {
  const league = getLeague(totalPoints);
  const next = getNextLeague(totalPoints);
  const progress = leagueProgress(totalPoints);
  return (
    <Link href="/leaderboard?tab=leagues" className="group">
      <div className="flex flex-col rounded-xl border border-accent/40 bg-gradient-to-br from-accent/[0.10] to-accent/[0.02] px-3 py-2.5 min-w-[104px] transition-shadow duration-150 ease-out group-hover:shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          League
        </span>
        <span className={`mt-1 flex items-center gap-1.5 text-lg font-extrabold leading-none ${league.color}`}>
          <span>{league.icon}</span>
          <span>{league.name}</span>
        </span>
        {next && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[9px] tabular-nums text-slate-400">{progress}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── league badge (inline) ──────────────────────────────────────────────────

function MiniLeagueBadge({ league }: { league: League }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${league.bg} ${league.color}`}>
      <span>{league.icon}</span>
      <span>{league.name}</span>
    </span>
  );
}

// ─── mini leaderboard (dashboard card) ──────────────────────────────────────

type MiniLeaderboardTab = "global" | "leagues";

function MiniLeaderboard({ leaderboard }: {
  leaderboard: Props["leaderboard"];
}) {
  const [tab, setTab] = useState<MiniLeaderboardTab>("global");

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Leaderboard</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            {tab === "global"
              ? leaderboard.userRank > 0
                ? `You're ranked ${medalEmoji(leaderboard.userRank)} out of ${leaderboard.totalPlayers} player${leaderboard.totalPlayers !== 1 ? "s" : ""}.`
                : "Complete a quiz to appear on the board."
              : "Compete in your league — coming soon!"}
          </p>
        </div>
        <Link
          href={tab === "leagues" ? "/leaderboard?tab=leagues" : "/leaderboard"}
          className="shrink-0 text-xs font-medium text-accent underline transition-opacity duration-150 ease-out hover:opacity-80"
        >
          Full leaderboard →
        </Link>
      </div>

      {/* Tab switcher */}
      <div className="mt-3 inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900/60" role="group">
        {([
          { key: "global" as MiniLeaderboardTab, label: "Global" },
          { key: "leagues" as MiniLeaderboardTab, label: "Leagues" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out ${
              tab === key
                ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Global tab */}
      {tab === "global" && (
        <>
          {leaderboard.entries.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No scores yet. Be the first to complete a quiz!
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {leaderboard.entries.slice(0, 5).map((e) => {
                const league = getLeague(e.totalPoints);
                const isMe = leaderboard.userRank > 0 && leaderboard.entries[leaderboard.userRank - 1]?.userId === e.userId;
                return (
                  <li
                    key={e.userId}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
                      isMe
                        ? "bg-accent/[0.07] dark:bg-accent/[0.12]"
                        : "bg-slate-50 dark:bg-slate-800/40"
                    }`}
                  >
                    <span className={`w-7 text-center text-sm font-bold tabular-nums ${e.rank <= 3 ? "text-base" : "text-slate-500"}`}>
                      {medalEmoji(e.rank)}
                    </span>
                    <UserAvatar src={e.avatarUrl || null} name={e.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                        {e.displayName}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <MiniLeagueBadge league={league} />
                        <span className="tabular-nums">{e.basePoints.toLocaleString()} + {e.streakPoints.toLocaleString()} streak</span>
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {e.totalPoints.toLocaleString()}
                      <span className="ml-0.5 text-xs font-normal text-slate-400"> pts</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Leagues tab — coming soon */}
      {tab === "leagues" && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/[0.03] px-5 py-8 text-center dark:border-accent/20 dark:bg-accent/[0.05]">
          <p className="text-3xl">🏟️</p>
          <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            League Leaderboards
          </p>
          <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            Coming Soon
          </span>
          <p className="mx-auto mt-3 max-w-xs text-xs text-slate-500">
            Compete against players in your league with weekly rankings, promotion zones, and rewards.
          </p>
          <Link
            href="/leaderboard?tab=leagues"
            className="mt-3 inline-block text-xs font-medium text-accent underline"
          >
            Preview all leagues →
          </Link>
        </div>
      )}
    </Card>
  );
}

// ─── score ring — small circular progress indicator ─────────────────────────

function ScoreRing({ correct, total, percentage, size = 36 }: { correct: number; total: number; percentage: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const filled = (percentage / 100) * c;
  const color =
    percentage >= 80 ? "stroke-emerald-500" :
    percentage >= 60 ? "stroke-amber-500" :
    "stroke-rose-400";
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className={color} strokeWidth={3} strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round" />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="fill-slate-700 dark:fill-slate-200 rotate-90 origin-center"
        style={{ fontSize: size * 0.24, fontWeight: 700 }}
      >
        {correct}/{total}
      </text>
    </svg>
  );
}

// ─── activity section — unified runs + topics ───────────────────────────────

type ActivityTab = "runs" | "topics";

function ActivitySection({
  sessions, requests, historyError, pendingRemovals, onRemove, onUndoRemove, onPrefill,
}: {
  sessions: DashboardSessionRow[];
  requests: DashboardRequestRow[];
  historyError: string | null;
  pendingRemovals: Map<string, number>;
  onRemove: (id: string) => void;
  onUndoRemove: (id: string) => void;
  onPrefill: (r: DashboardRequestRow) => void;
}) {
  const [tab, setTab] = useState<ActivityTab>("runs");
  const hasRuns = sessions.length > 0;
  const hasTopics = requests.length > 0;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <CardTitle>Activity</CardTitle>
        {/* Tab switcher */}
        <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900/60" role="group">
          {([
            { key: "runs" as ActivityTab, label: "Runs", count: sessions.length },
            { key: "topics" as ActivityTab, label: "Topics", count: requests.length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out ${
                tab === key
                  ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] tabular-nums ${tab === key ? "text-accent/60" : "text-slate-400"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {historyError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {historyError}
        </div>
      )}

      {/* Runs tab */}
      {tab === "runs" && (
        <div className="mt-4">
          {!hasRuns ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Complete a quiz to see your results here.
            </p>
          ) : (
            <ul className="space-y-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/session/${s.id}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-slate-50 active:scale-[0.995] dark:hover:bg-slate-800/40"
                  >
                    <ScoreRing correct={Math.round(s.percentage / 100 * s.questionCount)} total={s.questionCount} percentage={s.percentage} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {s.topic}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                        <span>{formatDateTimeStable(s.createdAt)}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {s.rankName}
                        </span>
                        <span>{s.questionCount} Q</span>
                        {s.durationSeconds != null && s.durationSeconds > 0 && (
                          <span>{formatDurationHuman(s.durationSeconds)}</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">
                      {s.score}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-400">pts</span>
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 ease-out group-hover:translate-x-0.5 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Topics tab */}
      {tab === "topics" && (
        <div className="mt-4">
          {!hasTopics ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Generate your first quiz to see topics here.
            </p>
          ) : (
            <ul className="space-y-1">
              {requests.map((r) => {
                const isPending = pendingRemovals.has(r.id);
                return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity duration-200 ease-out ${
                      isPending ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {r.topic}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTimeStable(r.createdAt)} · {r.questionCount} Q
                        {isPending && " · removing…"}
                      </p>
                    </div>
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => onUndoRemove(r.id)}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors duration-150 ease-out hover:bg-accent/10"
                      >
                        Undo
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <Link href={`/dashboard/quiz/${r.id}`}>
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors duration-150 ease-out hover:bg-accent/10 active:scale-[0.97]"
                          >
                            Start
                          </button>
                        </Link>
                        <button
                          type="button"
                          onClick={() => onPrefill(r)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          title="Edit and regenerate this quiz"
                        >
                          Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(r.id)}
                          className="-m-1 rounded-lg p-2 text-slate-300 transition-colors duration-150 ease-out hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400"
                          aria-label={`Remove: ${r.topic}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
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
    userTotalPoints: number; // for league computation
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
          <LeaguePill totalPoints={leaderboard.userTotalPoints} />
          <StatPill
            label="Avg score"
            value={
              stats.avgPercentage != null
                ? `${Math.round(stats.avgPercentage)}%`
                : "—"
            }
            accent={stats.avgPercentage != null && stats.avgPercentage >= 70}
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
                {!loading && (
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
      <MiniLeaderboard leaderboard={leaderboard} />

      {/* ── Activity — unified history ─────────────────────────────────── */}
      <ActivitySection
        sessions={sessions}
        requests={requests}
        historyError={historyError}
        pendingRemovals={pendingRemovals}
        onRemove={queueRemoval}
        onUndoRemove={undoRemoval}
        onPrefill={(r) => {
          setTitle(r.title ?? "");
          setSummaryText(r.summaryText ?? "");
          setNotes(r.notes ?? "");
          setQuestionCount(r.questionCount as QuestionCount);
          setFormExpanded(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
