"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GenerationProgress } from "@/components/ui/generation-progress";
import { QUESTION_COUNTS, type QuestionCount } from "@/lib/schemas/quiz";
import { getAllowedQuestionCountsForTier, getTier, type TierId } from "@/lib/tiers";
import { formatDateTimeStable } from "@/lib/format-date";
import { formatDurationHuman } from "@/lib/format-quiz-clock";
import { DailyProgressDashboard } from "@/components/dashboard/daily-progress-dashboard";
import type { SessionForDaily } from "@/lib/daily-progress";
import { recordQuizGenerationSeconds } from "@/lib/quiz-generation-timing";
import { UserAvatar } from "@/components/user-avatar";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { getLeague } from "@/lib/leagues";
import type { League } from "@/lib/leagues";
import type { RecommendedQuiz } from "@/lib/topics";
import { RecommendedQuizzes } from "@/components/dashboard/recommended-quizzes";
import { CustomQuizzesCard } from "@/components/dashboard/custom-quizzes-card";
import {
  UpgradeModal,
  type UpgradeReason,
} from "@/components/pricing/upgrade-modal";

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

// ─── dashboard status summary ───────────────────────────────────────────────

function StatusMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-[rgb(var(--surface-2))] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold leading-none tabular-nums text-[rgb(var(--foreground))]">
        {value}
      </p>
    </div>
  );
}

function DashboardStatusSummary({
  league,
  avgPercentage,
  totalSessions,
  sessionsLast7Days,
  userRank,
}: {
  league: League;
  avgPercentage: number | null;
  totalSessions: number;
  sessionsLast7Days: number;
  userRank: number;
}) {
  return (
    <section
      aria-label="Your learning status"
      className="rounded-xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_2px_rgba(26,26,32,0.04)] sm:min-w-[360px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
            Current status
          </p>
          <p className={`mt-1 text-2xl font-bold leading-none ${league.color}`}>
            {league.name}
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-white px-3 text-xs font-semibold text-[rgb(var(--foreground))] transition-[background-color,border-color,transform] duration-150 ease-out hover:border-[rgb(var(--accent)/0.28)] hover:bg-[rgb(var(--accent)/0.08)] active:scale-[0.97]"
        >
          Leaderboard
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatusMetric
          label="Accuracy"
          value={avgPercentage != null ? `${Math.round(avgPercentage)}%` : "New"}
        />
        <StatusMetric label="Quizzes" value={String(totalSessions)} />
        <StatusMetric label="Week" value={String(sessionsLast7Days)} />
        <StatusMetric label="Rank" value={userRank > 0 ? `#${userRank}` : "New"} />
      </div>
    </section>
  );
}

export type DashboardRelatedTopicSuggestion = {
  id: string;
  title: string;
  angle: string;
  sourceTitle: string;
  sourceCreatedAt: string;
  createdAt: string;
};

function RecentTopicIdeas({
  ideas,
  canCreateCustomQuiz,
  onSelect,
  onUpgrade,
}: {
  ideas: DashboardRelatedTopicSuggestion[];
  canCreateCustomQuiz: boolean;
  onSelect: (topic: string) => void;
  onUpgrade: () => void;
}) {
  if (ideas.length === 0) return null;
  const [primary, ...secondary] = ideas;
  const secondaryIdeas = secondary.slice(0, 4);

  return (
    <section aria-label="Custom quiz ideas from recent activity">
      <div className="rounded-xl border border-[rgb(var(--accent)/0.18)] bg-gradient-to-br from-[rgb(var(--accent)/0.06)] via-white to-white p-5 shadow-[0_1px_2px_rgba(26,26,32,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-ink))]">
              Recommended next
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-2xl">
              {primary.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[rgb(var(--muted))]">
              {primary.angle}
            </p>
          </div>

          {!canCreateCustomQuiz ? (
            <span className="inline-flex self-start rounded-full bg-[rgb(var(--accent)/0.12)] px-3 py-1 text-xs font-semibold text-[rgb(var(--accent-ink))]">
              Custom quizzes required
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs leading-relaxed text-[rgb(var(--muted))] sm:line-clamp-1">
              Based on your recent quiz history, especially{" "}
              <span className="font-medium text-[rgb(var(--foreground))]">
                {primary.sourceTitle}
              </span>
              .
            </p>

            {secondaryIdeas.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
                  Other good paths
                </p>
                <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
                  {secondaryIdeas.map((idea) =>
                    canCreateCustomQuiz ? (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() => onSelect(idea.title)}
                        className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[rgb(var(--accent)/0.22)] bg-white px-3 py-2.5 text-left text-xs font-semibold text-[rgb(var(--foreground))] transition-[background-color,border-color,transform] duration-150 ease-out hover:border-[rgb(var(--accent)/0.45)] hover:bg-[rgb(var(--accent)/0.08)] active:scale-[0.98] sm:inline-flex sm:w-auto sm:max-w-full sm:items-center sm:gap-2 sm:py-2"
                      >
                        <span className="min-w-0 leading-snug sm:line-clamp-1">
                          {idea.title}
                        </span>
                        <span className="shrink-0 pt-0.5 text-[rgb(var(--accent-ink))] opacity-70 transition-opacity group-hover:opacity-100 sm:pt-0">
                          Use
                        </span>
                      </button>
                    ) : (
                      <div
                        key={idea.id}
                        className="flex w-full items-start justify-between gap-3 rounded-lg border border-[rgb(var(--border))] bg-white/60 px-3 py-2.5 text-xs font-semibold text-[rgb(var(--muted))] sm:inline-flex sm:w-auto sm:max-w-full sm:items-center sm:gap-2 sm:py-2"
                        aria-disabled="true"
                      >
                        <span className="min-w-0 leading-snug sm:line-clamp-1">
                          {idea.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                          Locked
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() =>
              canCreateCustomQuiz ? onSelect(primary.title) : onUpgrade()
            }
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--accent))] px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-[rgb(var(--accent-ink))] active:scale-[0.98] sm:min-w-44"
          >
            {canCreateCustomQuiz ? "Create this quiz" : "Unlock custom quizzes"}
          </button>
        </div>
      </div>
    </section>
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

// ─── mini leaderboard (dashboard preview) ───────────────────────────────────

function MiniLeaderboard({ leaderboard }: {
  leaderboard: Props["leaderboard"];
}) {
  const previewEntries = leaderboard.entries.slice(0, 3);

  return (
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
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/40">
          No scores yet. Be the first to complete a quiz.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-3">
          {previewEntries.map((e) => {
            const league = getLeague(e.totalPoints);
            const isMe =
              leaderboard.userRank > 0 &&
              leaderboard.entries[leaderboard.userRank - 1]?.userId === e.userId;
            return (
              <li
                key={e.userId}
                className={`flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                  isMe
                    ? "bg-accent/[0.07] dark:bg-accent/[0.12]"
                    : "bg-slate-50 dark:bg-slate-800/40"
                }`}
              >
                <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-slate-500">
                  {medalEmoji(e.rank)}
                </span>
                <UserAvatar src={e.avatarUrl || null} name={e.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {e.displayName}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <MiniLeagueBadge league={league} />
                    <span className="tabular-nums">
                      {e.totalPoints.toLocaleString()} pts
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ─── score ring — small circular progress indicator ─────────────────────────

function ScoreRing({ correct, total, percentage, size = 36 }: { correct: number; total: number; percentage: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(c, (percentage / 100) * c));
  const color =
    percentage >= 80 ? "stroke-emerald-500" :
    percentage >= 60 ? "stroke-amber-500" :
    "stroke-rose-400";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block shrink-0" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-slate-200 dark:stroke-slate-700"
        strokeWidth={3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className={color}
        strokeWidth={3}
        strokeDasharray={c}
        strokeDashoffset={c - filled}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-700 dark:fill-slate-200"
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
  const [expanded, setExpanded] = useState(false);
  const hasRuns = sessions.length > 0;
  const hasTopics = requests.length > 0;
  const activeCount = tab === "runs" ? sessions.length : requests.length;
  const visibleSessions = expanded ? sessions : sessions.slice(0, 5);
  const visibleRequests = expanded ? requests : requests.slice(0, 5);
  const canExpand = activeCount > 5;

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest quiz runs and generated topics.
          </p>
        </div>
        {/* Tab switcher */}
        <div className="inline-flex self-start gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900/60" role="group">
          {([
            { key: "runs" as ActivityTab, label: "Runs", count: sessions.length },
            { key: "topics" as ActivityTab, label: "Topics", count: requests.length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setExpanded(false);
              }}
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
              {visibleSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/session/${s.id}`}
                    className="group grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-x-3 rounded-xl px-2 py-2.5 transition-colors duration-150 ease-out hover:bg-slate-50 active:scale-[0.995] dark:hover:bg-slate-800/40 sm:px-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center self-start">
                      <ScoreRing
                        correct={Math.round((s.percentage / 100) * s.questionCount)}
                        total={s.questionCount}
                        percentage={s.percentage}
                        size={34}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight text-slate-900 dark:text-white">
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
                    <div className="ml-2 flex items-center gap-2 self-center">
                      <span className="shrink-0 text-right text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">
                        {s.score}
                        <span className="ml-0.5 text-[10px] font-normal text-slate-400">pts</span>
                      </span>
                      <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 ease-out group-hover:translate-x-0.5 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
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
              {visibleRequests.map((r) => {
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

      {canExpand && (
        <div className="mt-4 flex justify-center border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-accent/30 hover:bg-accent/[0.04] hover:text-accent active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {expanded ? "Show less" : `Show all ${activeCount}`}
          </button>
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
  subscriptionTier: TierId;
  dailyQuizCount: number;
  dailyQuizLimit: number;
  recommendedQuizzes: RecommendedQuiz[];
  recentTopicIdeas: DashboardRelatedTopicSuggestion[];
  userEmail: string | null;
  alreadyOnWaitlist: boolean;
  initialCustomTopic: string | null;
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

function mergeTopicIdeas(
  primary: DashboardRelatedTopicSuggestion[],
  fallback: DashboardRelatedTopicSuggestion[],
) {
  const seen = new Set<string>();
  const out: DashboardRelatedTopicSuggestion[] = [];

  for (const idea of [...primary, ...fallback]) {
    const key = idea.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(idea);
    if (out.length >= 5) break;
  }

  return out;
}

export function DashboardView({
  userName,
  requests,
  sessions,
  dailyProgressSessions,
  subscriptionTier,
  dailyQuizCount,
  dailyQuizLimit,
  recommendedQuizzes,
  recentTopicIdeas,
  userEmail,
  alreadyOnWaitlist,
  initialCustomTopic,
  stats,
  leaderboard,
}: Props) {
  const router = useRouter();
  const generationLimitLabel =
    dailyQuizLimit > 0
      ? `${dailyQuizLimit} custom quizzes per day.`
      : "Unlimited custom quizzes.";
  const canCreateCustomQuiz = getTier(subscriptionTier).canCustomQuiz;

  // form state
  const [title, setTitle] = useState(initialCustomTopic ?? "");
  const [summaryText, setSummaryText] = useState("");
  const [notes, setNotes] = useState("");
  // Tier-gated question counts. Builder caps at 20, Scholar at 30, Master at 50.
  // Free tier returns []; the form is hidden anyway, but we fall back to the
  // full set so the effect hooks below don't see empty arrays on mount.
  const tierAllowedCounts = getAllowedQuestionCountsForTier(subscriptionTier);
  const allowedCounts =
    tierAllowedCounts.length > 0 ? tierAllowedCounts : (QUESTION_COUNTS as readonly number[]);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);

  // If the user's saved selection is above their tier ceiling (e.g. they
  // downgraded or a prefill carried an out-of-range value), clamp it down
  // to the largest allowed option. Do this in an effect so prefill-driven
  // changes are caught.
  useEffect(() => {
    if (!allowedCounts.includes(questionCount)) {
      const max = Math.max(...allowedCounts);
      setQuestionCount(max as QuestionCount);
    }
  }, [allowedCounts, questionCount]);
  const [showNotes, setShowNotes] = useState(false);

  // Collapse the full generator for returning users — we expand when the user
  // hits the "+ New quiz" trigger or prefills from history.
  const hasHistory = sessions.length > 0 || requests.length > 0;
  const [formExpanded, setFormExpanded] = useState<boolean>(
    Boolean(initialCustomTopic) || !hasHistory,
  );

  // open notes panel automatically when prefill sets a value
  useEffect(() => {
    if (notes.length > 0) setShowNotes(true);
  }, [notes]);

  // generate state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState(false);
  const [debugPayload, setDebugPayload] = useState<string | null>(null);

  // Upgrade modal — opened when /api/generate-quiz returns an upgradeReason.
  // Three trigger shapes: custom_quiz (free-tier gate), question_count
  // (quiz too long for tier), daily_limit (paid tier over its cap).
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);

  // history state — row-level undo (5s window before DELETE fires)
  const [pendingRemovals, setPendingRemovals] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [cachedRecentTopicIdeas, setCachedRecentTopicIdeas] = useState<
    DashboardRelatedTopicSuggestion[]
  >([]);

  useEffect(() => {
    const seen = new Set<string>();
    const ideas: DashboardRelatedTopicSuggestion[] = [];

    for (const session of sessions.slice(0, 5)) {
      try {
        const raw = window.sessionStorage.getItem(
          `memora:related-topics:${session.id}`,
        );
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;

        for (const item of parsed.slice(0, 5)) {
          if (!item || typeof item !== "object") continue;
          const maybe = item as { title?: unknown; angle?: unknown };
          if (
            typeof maybe.title !== "string" ||
            typeof maybe.angle !== "string"
          ) {
            continue;
          }

          const title = maybe.title.trim();
          const angle = maybe.angle.trim();
          const key = title.toLowerCase();
          if (!title || !angle || seen.has(key)) continue;
          seen.add(key);
          ideas.push({
            id: `cached:${session.id}:${ideas.length}`,
            title,
            angle,
            sourceTitle: session.topic,
            sourceCreatedAt: session.createdAt,
            createdAt: session.createdAt,
          });
          if (ideas.length >= 5) break;
        }
      } catch {
        continue;
      }

      if (ideas.length >= 5) break;
    }

    setCachedRecentTopicIdeas(ideas);
  }, [sessions]);

  const mergedRecentTopicIdeas = mergeTopicIdeas(
    recentTopicIdeas,
    cachedRecentTopicIdeas,
  );

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
        // Surface the upgrade modal for tier-gated errors so users see a
        // clear path forward instead of a red inline-error sentence.
        if (
          data.upgradeReason === "custom_quiz" ||
          data.upgradeReason === "question_count" ||
          data.upgradeReason === "daily_limit"
        ) {
          setUpgradeReason(data.upgradeReason);
          return;
        }
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
      {/* Tier-gate modal. Mounted at the top so it overlays the whole view. */}
      <UpgradeModal
        open={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        currentTier={subscriptionTier}
        reason={upgradeReason ?? "custom_quiz"}
      />

      {/* ── Greeting + status summary ──────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-editorial-hero text-4xl leading-[1.08] text-[rgb(var(--foreground))] sm:text-5xl">
            {userName
              ? `Welcome back, ${userName.split(" ")[0]}.`
              : "Welcome back."}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[rgb(var(--muted))]">
            {subscriptionTier === "free"
              ? "Pick up where you left off below."
              : "Turn what you read into questions, then keep the streak moving."}
          </p>
        </div>

        {stats.totalSessions === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--accent)/0.2)] bg-[rgb(var(--accent)/0.06)] px-4 py-3 lg:min-w-[360px] lg:self-end">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--accent))] text-base text-white"
            >
              ★
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-ink))]">
                Your rank
              </p>
              <p className="mt-0.5 text-sm leading-snug text-[rgb(var(--foreground))]">
                Play your first quiz to unlock it.
              </p>
            </div>
          </div>
        ) : (
          <DashboardStatusSummary
            league={getLeague(leaderboard.userTotalPoints)}
            avgPercentage={stats.avgPercentage}
            totalSessions={stats.totalSessions}
            sessionsLast7Days={stats.sessionsLast7Days}
            userRank={leaderboard.userRank}
          />
        )}
      </div>

      {/* ── Custom quizzes — paid action or free-tier gate ─────────────── */}
      {subscriptionTier !== "free" && (
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
                  {generationLimitLabel}
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
                    Paste your notes or a summary, we&apos;ll turn them into questions.
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
                      placeholder='e.g. "Thinking, Fast and Slow", chapters 1–3'
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
                        {allowedCounts.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
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

                {/* CTA — full-width, prominent */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto sm:px-8"
                >
                  {loading ? "Generating…" : "Generate quiz →"}
                </Button>
              </form>
            </>
          )}
        </Card>
      )}

      {subscriptionTier === "free" && (
        <CustomQuizzesCard
          userEmail={userEmail}
          alreadyOnWaitlist={alreadyOnWaitlist}
        />
      )}

      <RecentTopicIdeas
        ideas={mergedRecentTopicIdeas}
        canCreateCustomQuiz={canCreateCustomQuiz}
        onSelect={(topic) => {
          setTitle(topic);
          setSummaryText("");
          setNotes("");
          setFormExpanded(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onUpgrade={() => setUpgradeReason("custom_quiz")}
      />

      {/* ── Picked for you — hero + alternates ─────────────────────────── */}
      {recommendedQuizzes.length > 0 && (
        <RecommendedQuizzes quizzes={recommendedQuizzes} />
      )}

      {/* ── Daily progress ─────────────────────────────────────────────── */}
      <DailyProgressDashboard
        sessions={dailyProgressSessions}
        subscriptionTier={subscriptionTier}
      />

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

      {/* ── Mini leaderboard ───────────────────────────────────────────── */}
      <MiniLeaderboard leaderboard={leaderboard} />
    </div>
  );
}
