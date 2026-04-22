"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserAvatar } from "@/components/user-avatar";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/leaderboard";
import { LEAGUES, getLeague, getNextLeague, leagueProgress } from "@/lib/leagues";
import type { League } from "@/lib/leagues";

// ─── helpers ─────────────────────────────────────────────────────────────────

function medal(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
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

type Tab = "active" | "leagues" | "challenges" | "pvp";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// ─── league badge ────────────────────────────────────────────────────────────

function LeagueBadge({ league, size = "sm" }: { league: League; size?: "sm" | "md" }) {
  const padding = size === "md" ? "px-2.5 py-1" : "px-1.5 py-0.5";
  const text = size === "md" ? "text-xs" : "text-[10px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${league.bg} ${league.color} ${padding} ${text}`}>
      <span>{league.icon}</span>
      <span>{league.name}</span>
    </span>
  );
}

// ─── points breakdown tooltip ────────────────────────────────────────────────

function PointsBreakdown({ base, streak, total }: { base: number; streak: number; total: number }) {
  return (
    <span className="group relative inline-flex items-baseline gap-0.5">
      <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white sm:text-base">
        {pts(total)}
      </span>
      <span className="ml-0.5 text-xs font-normal text-slate-400">pts</span>
      {/* Hover tooltip with breakdown */}
      <span className="pointer-events-none absolute -top-10 left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {pts(base)} base + {pts(streak)} streak
      </span>
    </span>
  );
}

function CompetitiveScore({
  entry,
  compact = false,
}: {
  entry: LeaderboardEntry;
  compact?: boolean;
}) {
  return (
    <span className="group relative inline-flex items-baseline gap-0.5">
      <span className={`${compact ? "text-sm" : "text-base"} font-bold tabular-nums text-slate-900 dark:text-white`}>
        {pts(entry.competitiveScore)}
      </span>
      <span className="ml-0.5 text-xs font-normal text-slate-400">rating</span>
      <span className="pointer-events-none absolute -top-12 left-1/2 z-30 hidden w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        Accuracy, pace, streak, and capped ranked runs. Raw grinding is limited.
      </span>
    </span>
  );
}

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
  const league = getLeague(entry.totalPoints);
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
      <LeagueBadge league={league} size="sm" />
      <div className="flex flex-col items-center">
        <p className="text-xl font-extrabold tabular-nums leading-none text-slate-900 dark:text-white sm:text-2xl">
          {pts(entry.totalPoints)}
          <span className="ml-0.5 text-xs font-normal text-slate-500"> pts</span>
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">
          {pts(entry.basePoints)} base + {pts(entry.streakPoints)} streak
        </p>
      </div>
      <div className="mt-0.5 flex flex-wrap justify-center gap-x-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-[11px]">
        <span>{entry.quizCount} quizzes</span>
        {entry.avgAccuracy != null && <span>&middot; {Math.round(entry.avgAccuracy)}%</span>}
        {entry.bestStreak > 0 && <span>&middot; {entry.bestStreak}</span>}
      </div>
    </motion.div>
  );
}

// ─── league leaderboard view ─────────────────────────────────────────────────

function LeagueLeaderboard({
  entries,
  currentUserId,
  userTotalPoints,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
  userTotalPoints: number;
}) {
  const current = getLeague(userTotalPoints);
  const next = getNextLeague(userTotalPoints);
  const progress = leagueProgress(userTotalPoints);
  const leagueRange = next ? next.minPoints - current.minPoints : 0;
  const leagueProgressPoints = next
    ? Math.max(0, userTotalPoints - current.minPoints)
    : 0;
  const leagueEntries = entries
    .filter((entry) => entry.league === current.name)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const meRank = leagueEntries.find((entry) => entry.userId === currentUserId)?.rank ?? 0;
  const topEntries = leagueEntries.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* User's current league */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current league
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-4xl" aria-hidden>{current.icon}</span>
              <span className={`text-2xl font-bold ${current.color}`}>{current.name}</span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Your league is based on lifetime activity points. Inside each
              league, players are ranked by competitive rating: accuracy, pace,
              streak, and capped ranked runs.
            </p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              Your league rank
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {meRank > 0 ? medal(meRank) : "New"}
            </p>
            <p className="text-xs text-slate-500">
              {meRank > 0 ? `of ${leagueEntries.length} players` : "Complete a quiz"}
            </p>
          </div>
        </div>

        {/* Progress to next league */}
        {next && (
          <div className="mt-5 max-w-xl">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{current.name} ({pts(current.minPoints)} pts)</span>
              <span>{next.name} ({pts(next.minPoints)} pts)</span>
            </div>
            <div
              className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              aria-label={`${pts(leagueProgressPoints)} of ${pts(leagueRange)} activity points toward ${next.name}`}
            >
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {pts(leagueProgressPoints)} / {pts(leagueRange)} activity points
              toward {next.name} · {pts(next.minPoints - userTotalPoints)} left
            </p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60">
        <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-[3rem_1fr_7rem_6rem_6rem_6rem]">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Rating</span>
          <span className="hidden text-right sm:block">Accuracy</span>
          <span className="hidden text-right sm:block">Pace</span>
          <span className="hidden text-right sm:block">Ranked runs</span>
        </div>

        {topEntries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Complete a quiz to enter your league leaderboard.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {topEntries.map((entry) => {
              const isMe = entry.userId === currentUserId;
              return (
                <li
                  key={entry.userId}
                  className={`grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 px-4 py-3 transition-colors duration-150 ease-out sm:grid-cols-[3rem_1fr_7rem_6rem_6rem_6rem] ${
                    isMe
                      ? "bg-accent/[0.06] dark:bg-accent/[0.10]"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <span className="text-center text-sm font-bold tabular-nums text-slate-600 dark:text-slate-400">
                    {medal(entry.rank)}
                  </span>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar
                      src={entry.avatarUrl || null}
                      name={entry.displayName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isMe ? "text-accent" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {entry.displayName}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] font-medium text-accent opacity-70">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:hidden">
                        {entry.competitiveAccuracy != null
                          ? `${Math.round(entry.competitiveAccuracy)}% accuracy`
                          : "New rating"}{" "}
                        &middot; {entry.bestStreak} best streak
                      </p>
                    </div>
                  </div>
                  <span className="text-right">
                    <CompetitiveScore entry={entry} compact />
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {entry.competitiveAccuracy != null
                      ? `${Math.round(entry.competitiveAccuracy)}%`
                      : "\u2013"}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {entry.avgSecondsPerQuestion != null
                      ? `${Math.round(entry.avgSecondsPerQuestion)}s`
                      : "\u2013"}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                    {entry.competitiveQuizCredits.toFixed(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* All leagues grid */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          All Leagues
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {LEAGUES.map((l) => {
            const isCurrent = l.name === current.name;
            return (
              <div
                key={l.name}
                className={`relative flex flex-col items-center rounded-xl border p-3 text-center transition-shadow ${
                  isCurrent
                    ? "border-accent/50 bg-accent/[0.06] shadow-sm dark:border-accent/40"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    You
                  </span>
                )}
                <span className="text-2xl">{l.icon}</span>
                <p className={`mt-1 text-xs font-bold ${l.color}`}>{l.name}</p>
                <p className="text-[10px] tabular-nums text-slate-400">{pts(l.minPoints)}+ pts</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeaserPanel({
  eyebrow,
  title,
  body,
  bullets,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/[0.04] p-6 dark:border-accent/30 dark:bg-accent/[0.06] sm:p-8">
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
        {body}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          >
            {bullet}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  entries: LeaderboardEntry[];
  competitiveEntries: LeaderboardEntry[];
  currentUserId: string;
  userRank: number;
  period: LeaderboardPeriod;
  initialTab?: Tab;
};

export function LeaderboardView({
  entries,
  competitiveEntries,
  currentUserId,
  userRank,
  period,
  initialTab = "active",
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  const podium = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);

  const userRowRef = useRef<HTMLLIElement | null>(null);
  const [userRowInView, setUserRowInView] = useState(true);

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
    const params = new URLSearchParams();
    if (p !== "alltime") params.set("p", p);
    if (tab !== "active") params.set("tab", tab);
    const query = params.toString();
    const url = query ? `/leaderboard?${query}` : "/leaderboard";
    router.push(url, { scroll: false });
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    const params = new URLSearchParams();
    if (period !== "alltime") params.set("p", period);
    if (nextTab !== "active") params.set("tab", nextTab);
    const query = params.toString();
    router.replace(query ? `/leaderboard?${query}` : "/leaderboard", { scroll: false });
  }

  const isEmpty = entries.length === 0;
  const isAlone = entries.length === 1 && entries[0]?.userId === currentUserId;

  const meEntry = useMemo(
    () => entries.find((e) => e.userId === currentUserId) ?? null,
    [entries, currentUserId],
  );

  const competitiveMeEntry = useMemo(
    () => competitiveEntries.find((e) => e.userId === currentUserId) ?? null,
    [competitiveEntries, currentUserId],
  );
  const userTotalPoints = meEntry?.totalPoints ?? competitiveMeEntry?.totalPoints ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-24 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:hover:text-white"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboards</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Activity points show who studies the most. Competitive rating rewards
            accuracy, pace, streaks, and capped quiz volume.
          </p>
        </div>

        {/* User's standing badge */}
        {userRank > 0 && tab === "active" && (
          <div className="shrink-0 rounded-2xl border border-accent/40 bg-accent/[0.07] px-4 py-2.5 text-center dark:bg-accent/[0.12]">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Your active rank
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {medal(userRank)}
            </p>
            <p className="text-xs text-slate-500">of {entries.length} players</p>
          </div>
        )}
      </div>

      {/* ── Tab switcher ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60"
          role="group"
          aria-label="Leaderboard tab"
        >
          {([
            { key: "active" as Tab, label: "Most active" },
            { key: "leagues" as Tab, label: "Leagues" },
            { key: "challenges" as Tab, label: "Challenges" },
            { key: "pvp" as Tab, label: "PvP" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                tab === key
                  ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Period tabs */}
        {(tab === "active" || tab === "leagues") && (
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
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                  p === period
                    ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Leagues tab ─────────────────────────────────────────────────── */}
      {tab === "leagues" && (
        <LeagueLeaderboard
          entries={competitiveEntries}
          currentUserId={currentUserId}
          userTotalPoints={userTotalPoints}
        />
      )}

      {tab === "challenges" && (
        <TeaserPanel
          eyebrow="Coming soon"
          title="Weekly challenges"
          body="A fixed quiz pool for everyone, so competition is clean: same topic, same rules, same scoring window."
          bullets={[
            "Curated topic sets",
            "Weekly reset",
            "Fair competitive scoring",
          ]}
        />
      )}

      {tab === "pvp" && (
        <TeaserPanel
          eyebrow="Coming soon"
          title="PvP leaderboards"
          body="Private and public challenge boards for friends, classes, and teams who want a tighter race than the main activity board."
          bullets={[
            "Invite-only boards",
            "Head-to-head runs",
            "Shared challenge history",
          ]}
        />
      )}

      {/* ── Most active learners tab ────────────────────────────────────── */}
      {tab === "active" && (
        <>
          {/* ── Empty states ───────────────────────────────────────────── */}
          {isEmpty && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                No scores yet
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {period === "alltime"
                  ? "Be the first. Complete a quiz to claim the #1 spot."
                  : `Nobody has completed a quiz ${period === "week" ? "this week" : "this month"} yet.`}
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-block text-sm font-medium text-accent underline"
              >
                Generate a quiz &rarr;
              </Link>
            </div>
          )}

          {isAlone && !isEmpty && (
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] px-8 py-10 text-center dark:border-accent/40 dark:bg-accent/[0.08]">
              <p className="text-2xl">🏆</p>
              <p className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                You&apos;re the most active learner here.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Invite others to register and compete.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Most active learners
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ranked by total activity points. Use Leagues for the normalized
              competitive rating.
            </p>
          </div>

          {/* ── Podium (top 3) ─────────────────────────────────────────── */}
          {!isEmpty && !isAlone && podium.length > 0 && (
            <div className="grid grid-cols-3 items-end gap-2 pt-2 sm:gap-4">
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

          {/* ── Leaderboard table (rest, ranks 4+) ──────────────────────── */}
          {!isEmpty && !isAlone && rest.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">

              {/* Table header */}
              <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-[3rem_1fr_5rem_7rem_6rem_6rem_5rem]">
                <span>Rank</span>
                <span>Player</span>
                <span className="hidden text-right sm:block">League</span>
                <span className="text-right">Points</span>
                <span className="hidden text-right sm:block">Quizzes</span>
                <span className="hidden text-right sm:block">Avg %</span>
                <span className="hidden text-right sm:block">Streak</span>
              </div>

              {/* Rows */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rest.map((e) => {
                  const isMe = e.userId === currentUserId;
                  const league = getLeague(e.totalPoints);
                  return (
                    <li
                      key={e.userId}
                      ref={isMe ? userRowRef : undefined}
                      className={`grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 px-4 py-3 transition-colors duration-150 ease-out sm:grid-cols-[3rem_1fr_5rem_7rem_6rem_6rem_5rem] ${
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
                            {league.icon} {league.name} &middot; {e.quizCount} quizzes
                            {e.avgAccuracy != null ? ` · ${Math.round(e.avgAccuracy)}%` : ""}
                          </p>
                          {e.fullName && e.fullName !== e.displayName && (
                            <p className="hidden truncate text-xs text-slate-400 sm:block">
                              {e.fullName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* League — desktop */}
                      <span className="hidden sm:flex sm:justify-end">
                        <LeagueBadge league={league} size="sm" />
                      </span>

                      {/* Points — always visible, with breakdown tooltip */}
                      <span className="text-right sm:pr-0">
                        <PointsBreakdown
                          base={e.basePoints}
                          streak={e.streakPoints}
                          total={e.totalPoints}
                        />
                      </span>

                      {/* Desktop-only columns */}
                      <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                        {e.quizCount}
                      </span>
                      <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                        {e.avgAccuracy != null ? `${Math.round(e.avgAccuracy)}%` : "\u2013"}
                      </span>
                      <span className="hidden text-right text-sm tabular-nums text-slate-600 dark:text-slate-400 sm:block">
                        {e.bestStreak > 0 ? `${e.bestStreak} \u2713` : "\u2013"}
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
                Complete a quiz to earn points &rarr;
              </Link>
            </p>
          )}
        </>
      )}

      {/* ── Sticky "You" row when off-screen (active tab only) ─────────── */}
      {tab === "active" && meEntry && userRank > 3 && !userRowInView && (
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
                {pts(meEntry.basePoints)} base + {pts(meEntry.streakPoints)} streak &middot;{" "}
                {meEntry.quizCount} quizzes
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
