"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  month: "This month",
  week: "This week",
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// ─── podium card ─────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  isMe,
  delayMs,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  delayMs: number;
}) {
  const rank = entry.rank;
  const accent =
    rank === 1
      ? "from-amber-100 to-amber-50 border-amber-300/70 dark:from-amber-900/40 dark:border-amber-500/40"
      : rank === 2
        ? "from-slate-100 to-slate-50 border-slate-300 dark:from-slate-700/40 dark:border-slate-500/40"
        : "from-orange-100 to-orange-50 border-orange-300/70 dark:from-orange-900/40 dark:border-orange-500/40";

  const avatarRing =
    rank === 1
      ? "ring-4 ring-amber-300"
      : rank === 2
        ? "ring-4 ring-slate-300"
        : "ring-4 ring-orange-300";

  // Visual "height" cue so #1 feels physically tallest (only on sm+)
  const podiumHeight =
    rank === 1 ? "sm:mt-0" : rank === 2 ? "sm:mt-4" : "sm:mt-6";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: delayMs / 1000 }}
      className={`relative flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-b p-4 text-center sm:p-5 ${accent} ${podiumHeight}`}
    >
      {isMe && (
        <span className="absolute -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          You
        </span>
      )}
      <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
        {medal(rank)}
      </span>
      <div className={`rounded-full ${avatarRing}`}>
        <UserAvatar src={entry.avatarUrl || null} name={entry.displayName} size="md" />
      </div>
      <p className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white sm:text-base">
        {entry.displayName}
      </p>
      <p className="text-xl font-extrabold tabular-nums leading-none text-slate-900 dark:text-white sm:text-2xl">
        {pts(entry.totalPoints)}
        <span className="ml-0.5 text-xs font-normal text-slate-500"> pts</span>
      </p>
      <div className="mt-0.5 flex flex-wrap justify-center gap-x-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-[11px]">
        <span>{entry.quizCount} quizzes</span>
        {entry.avgAccuracy != null && <span>· {Math.round(entry.avgAccuracy)}%</span>}
        {entry.bestStreak > 0 && <span>· 🔥 {entry.bestStreak}</span>}
      </div>
    </motion.div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  userRank: number;
  period: LeaderboardPeriod;
};

export function LeaderboardView({ entries, currentUserId, userRank, period }: Props) {
  const router = useRouter();

  const podium = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);

  const userRowRef = useRef<HTMLLIElement | null>(null);
  const [userRowInView, setUserRowInView] = useState(true);

  // Track whether the current user's row in the table is visible.
  // Only relevant when the user is ranked 4+ (podium is not enough).
  useEffect(() => {
    if (userRank <= 3) {
      setUserRowInView(true);
      return;
    }
    const el = userRowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setUserRowInView(entry?.isIntersecting ?? false),
      { rootMargin: "-10% 0px -10% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [userRank, rest.length]);

  function setPeriod(p: LeaderboardPeriod) {
    const url = p === "alltime" ? "/leaderboard" : `/leaderboard?p=${p}`;
    router.push(url, { scroll: false });
  }

  const isEmpty = entries.length === 0;
  const isAlone = entries.length === 1 && entries[0]?.userId === currentUserId;

  const meEntry = useMemo(
    () => entries.find((e) => e.userId === currentUserId) ?? null,
    [entries, currentUserId],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-24 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:hover:text-white"
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
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
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

      {/* ── Podium (top 3) ─────────────────────────────────────────────── */}
      {!isEmpty && !isAlone && podium.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-2 pt-2 sm:gap-4">
          {/* Visually: 2nd · 1st · 3rd so #1 is centered on sm+ */}
          {[podium[1], podium[0], podium[2]].map((p, i) => {
            if (!p) return <div key={`ph-${i}`} />;
            return (
              <PodiumCard
                key={p.userId}
                entry={p}
                isMe={p.userId === currentUserId}
                delayMs={i * 70}
              />
            );
          })}
        </div>
      )}

      {/* ── Leaderboard table (rest, ranks 4+) ───────────────────────────── */}
      {!isEmpty && !isAlone && rest.length > 0 && (
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
            {rest.map((e) => {
              const isMe = e.userId === currentUserId;
              return (
                <li
                  key={e.userId}
                  ref={isMe ? userRowRef : undefined}
                  className={`grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 px-4 py-3 transition-colors duration-150 ease-out sm:grid-cols-[3rem_1fr_7rem_6rem_6rem_5rem] ${
                    isMe
                      ? "bg-accent/[0.06] dark:bg-accent/[0.10]"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  }`}
                >
                  {/* Rank */}
                  <span className="text-center text-sm font-bold tabular-nums text-slate-600 dark:text-slate-400">
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
                      <p
                        className={`truncate text-sm font-semibold ${
                          isMe ? "text-accent" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {e.displayName}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] font-medium text-accent opacity-70">
                            (you)
                          </span>
                        )}
                      </p>
                      {/* Mobile: inline secondary stats under name */}
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:hidden">
                        {e.quizCount} quizzes
                        {e.avgAccuracy != null ? ` · ${Math.round(e.avgAccuracy)}%` : ""}
                        {e.bestStreak > 0 ? ` · 🔥 ${e.bestStreak}` : ""}
                      </p>
                      {e.fullName && e.fullName !== e.displayName && (
                        <p className="hidden truncate text-xs text-slate-400 sm:block">
                          {e.fullName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Points — always visible */}
                  <span className="text-right text-sm font-bold tabular-nums text-slate-900 dark:text-white sm:pr-0">
                    {pts(e.totalPoints)}
                    <span className="ml-0.5 text-xs font-normal text-slate-400"> pts</span>
                  </span>

                  {/* Desktop-only columns */}
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {e.quizCount}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {e.avgAccuracy != null ? `${Math.round(e.avgAccuracy)}%` : "—"}
                  </span>
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

      {/* ── Sticky "You" row when off-screen ───────────────────────────── */}
      {meEntry && userRank > 3 && !userRowInView && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
        >
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <span className="w-10 text-center text-sm font-bold tabular-nums text-accent">
              {medal(userRank)}
            </span>
            <UserAvatar src={meEntry.avatarUrl || null} name={meEntry.displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-accent">
                {meEntry.displayName}
                <span className="ml-1.5 text-[10px] font-medium text-accent/70">(you)</span>
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {meEntry.quizCount} quizzes
                {meEntry.avgAccuracy != null
                  ? ` · ${Math.round(meEntry.avgAccuracy)}%`
                  : ""}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {pts(meEntry.totalPoints)}
              <span className="ml-0.5 text-xs font-normal text-slate-400"> pts</span>
            </span>
            <button
              type="button"
              onClick={() => userRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-150 ease-out hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Scroll to me
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
