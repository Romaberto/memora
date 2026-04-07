"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/leaderboard";

// ─── helpers ─────────────────────────────────────────────────────────────────

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function pts(n: number) {
  return n.toLocaleString();
}

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  alltime: "All time",
  month:   "This month",
  week:    "This week",
};

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  userRank: number;
  period: LeaderboardPeriod;
};

export function LeaderboardView({ entries, currentUserId, userRank, period }: Props) {
  const router = useRouter();

  function setPeriod(p: LeaderboardPeriod) {
    const url = p === "alltime" ? "/leaderboard" : `/leaderboard?p=${p}`;
    router.push(url);
  }

  const isEmpty = entries.length === 0;
  const isAlone = entries.length === 1 && entries[0]?.userId === currentUserId;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Global Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ranked by total points earned from completed quizzes.
          </p>
        </div>

        {/* User's standing badge */}
        {userRank > 0 && (
          <div className="shrink-0 rounded-2xl border border-accent/40 bg-accent/[0.07] px-4 py-2.5 text-center dark:bg-accent/[0.12]">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Your rank
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {medal(userRank)}
            </p>
            <p className="text-xs text-slate-500">of {entries.length} players</p>
          </div>
        )}
      </div>

      {/* ── Period tabs ─────────────────────────────────────────────────── */}
      <div
        className="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60"
        role="group"
        aria-label="Leaderboard time period"
      >
        {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              p === period
                ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── Empty states ─────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            No scores yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {period === "alltime"
              ? "Be the first — complete a quiz to claim the #1 spot."
              : `Nobody has completed a quiz ${period === "week" ? "this week" : "this month"} yet.`}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-accent underline"
          >
            Generate a quiz →
          </Link>
        </div>
      )}

      {isAlone && !isEmpty && (
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] px-8 py-10 text-center dark:border-accent/40 dark:bg-accent/[0.08]">
          <p className="text-2xl">🏆</p>
          <p className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-100">
            You&apos;re #1 — and the only player!
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Invite others to register and compete.
          </p>
        </div>
      )}

      {/* ── Leaderboard table ─────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">

          {/* Table header */}
          <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-[3rem_1fr_7rem_6rem_6rem_5rem]">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Points</span>
            <span className="hidden text-right sm:block">Quizzes</span>
            <span className="hidden text-right sm:block">Avg %</span>
            <span className="hidden text-right sm:block">Streak</span>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((e) => {
              const isMe = e.userId === currentUserId;
              return (
                <li
                  key={e.userId}
                  className={`grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 px-4 py-3 sm:grid-cols-[3rem_1fr_7rem_6rem_6rem_5rem] ${
                    isMe
                      ? "bg-accent/[0.06] dark:bg-accent/[0.10]"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`text-center text-sm font-bold tabular-nums ${
                      e.rank <= 3 ? "text-xl leading-none" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {medal(e.rank)}
                  </span>

                  {/* Player */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar
                      src={e.avatarUrl || null}
                      name={e.displayName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${isMe ? "text-accent" : "text-slate-900 dark:text-white"}`}>
                        {e.displayName}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] font-medium text-accent opacity-70">
                            (you)
                          </span>
                        )}
                      </p>
                      {e.fullName && e.fullName !== e.displayName && (
                        <p className="truncate text-xs text-slate-400">{e.fullName}</p>
                      )}
                    </div>
                  </div>

                  {/* Points — always visible */}
                  <span className="text-right text-sm font-bold tabular-nums text-slate-900 dark:text-white sm:pr-0">
                    {pts(e.totalPoints)}<span className="ml-0.5 text-xs font-normal text-slate-400"> pts</span>
                  </span>

                  {/* Quizzes — hidden on mobile */}
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {e.quizCount}
                  </span>

                  {/* Avg accuracy — hidden on mobile */}
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {e.avgAccuracy != null ? `${Math.round(e.avgAccuracy)}%` : "—"}
                  </span>

                  {/* Best streak — hidden on mobile */}
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {e.bestStreak > 0 ? `${e.bestStreak} ✓` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Not on board yet */}
      {!isEmpty && userRank === 0 && (
        <p className="text-center text-sm text-slate-500">
          You&apos;re not on the board yet for this period.{" "}
          <Link href="/dashboard" className="font-medium text-accent underline">
            Complete a quiz to earn points →
          </Link>
        </p>
      )}
    </div>
  );
}
