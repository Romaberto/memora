"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle } from "@/components/ui/card";
import {
  type SessionForDaily,
  buildDayBuckets,
  bestDayInPeriod,
  dayKeyShortLabel,
  lastNDayKeys,
  periodTotals,
} from "@/lib/daily-progress";

const FREE_DAYS = 7;
const PRO_DAYS = 30;

type Tier = "free" | "pro";

type Props = {
  sessions: SessionForDaily[];
  subscriptionTier: Tier;
};

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function DailyProgressDashboard({ sessions, subscriptionTier }: Props) {
  const [rangeDays, setRangeDays] = useState<number>(FREE_DAYS);
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  const maxRange = subscriptionTier === "pro" ? PRO_DAYS : FREE_DAYS;
  const effectiveDays = Math.min(rangeDays, maxRange);
  const rangeLockedToSeven = subscriptionTier === "free";

  const dayKeys = useMemo(() => lastNDayKeys(effectiveDays), [effectiveDays]);

  const buckets = useMemo(
    () => buildDayBuckets(sessions, dayKeys),
    [sessions, dayKeys],
  );

  const totals = useMemo(
    () => periodTotals(dayKeys, buckets),
    [dayKeys, buckets],
  );

  const maxBarScore = useMemo(() => {
    let m = 1;
    for (const k of dayKeys) {
      const s = buckets.get(k)?.totalScore ?? 0;
      if (s > m) m = s;
    }
    return m;
  }, [dayKeys, buckets]);

  const best = useMemo(
    () => bestDayInPeriod(dayKeys, buckets),
    [dayKeys, buckets],
  );

  const activeBucket = selectedYmd ? buckets.get(selectedYmd) : null;

  // Auto-scroll the chart to the right (most recent days) on load or range change
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartRef.current;
    if (el) {
      // Use requestAnimationFrame to ensure DOM has rendered
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
  }, [effectiveDays]);

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Daily progress</CardTitle>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Track points and accuracy by day. Tap a day for details.
          </p>
        </div>
        <div
          className={`flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:max-w-[13.5rem] ${
            subscriptionTier === "free"
              ? "rounded-xl border border-slate-200 bg-slate-50/90 p-2 dark:border-slate-700 dark:bg-slate-900/50"
              : ""
          }`}
        >
          <div
            className={`flex gap-1 p-1 ${
              subscriptionTier === "pro"
                ? "rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"
                : ""
            }`}
            role="group"
            aria-label="Date range"
          >
            <button
              type="button"
              onClick={() => {
                setRangeDays(FREE_DAYS);
                setSelectedYmd(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                rangeDays === FREE_DAYS || rangeLockedToSeven
                  ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              7 days
            </button>
            {subscriptionTier === "pro" ? (
              <button
                type="button"
                onClick={() => {
                  setRangeDays(PRO_DAYS);
                  setSelectedYmd(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                  rangeDays === PRO_DAYS
                    ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                30 days
              </button>
            ) : (
              <span
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500"
                title="Included with Memora Pro"
              >
                <LockIcon />
                30 days
              </span>
            )}
          </div>
          {subscriptionTier === "free" ? (
            <p className="border-t border-slate-200 px-1 pb-0.5 pt-2 text-[11px] leading-snug text-slate-500 dark:border-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Memora Pro
              </span>{" "}
              unlocks the 30-day view and deeper progress history.
            </p>
          ) : null}
        </div>
      </div>

      {/* Period achievements — hero layout: Period points elevated */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
        {/* Hero: Period points */}
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/[0.04] to-transparent px-4 py-3 dark:border-accent/40 dark:from-accent/[0.18]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
            Period points
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums leading-none text-accent sm:text-4xl">
            {totals.totalScore}
          </p>
          {best && totals.sessionCount > 0 ? (
            <p className="mt-2 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
              <span className="mr-1" aria-hidden>
                👑
              </span>
              Best day{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {dayKeyShortLabel(best.key)}
              </span>{" "}
              · {best.totalScore} pts
            </p>
          ) : null}
        </div>

        {/* Supporting: Quizzes */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Quizzes
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums leading-none">
            {totals.sessionCount}
          </p>
        </div>

        {/* Supporting: Avg score */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Avg score
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums leading-none">
            {totals.avgPercentage != null
              ? `${Math.round(totals.avgPercentage)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Bar chart + day filters */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Daily score (points)
          </p>
          {maxBarScore > 1 && totals.sessionCount > 0 ? (
            <p className="text-[10px] font-medium tabular-nums text-slate-400">
              Max {maxBarScore}
            </p>
          ) : null}
        </div>

        {/* Chart region — bars overlaid on subtle gridlines */}
        <div className="relative">
          {/* Gridlines (25 / 50 / 75 / 100% of max) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[18px] top-[14px] flex flex-col-reverse justify-between" aria-hidden>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <div
                key={t}
                className="h-px w-full bg-slate-200/70 dark:bg-slate-700/60"
              />
            ))}
          </div>

          <div ref={chartRef} className="relative flex gap-1.5 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dayKeys.map((key) => {
              const b = buckets.get(key)!;
              const h = Math.round((b.totalScore / maxBarScore) * 100);
              const isSelected = selectedYmd === key;
              const isToday = key === dayKeys[dayKeys.length - 1];
              const isBest =
                !!best && best.key === key && b.totalScore > 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSelectedYmd((prev) => (prev === key ? null : key))
                  }
                  className={`relative flex min-w-[2.75rem] flex-none flex-col items-center gap-1.5 rounded-xl border px-1 py-2 transition-[border-color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                    isSelected
                      ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                      : isBest
                        ? "border-amber-300/70 bg-amber-50/60 hover:border-amber-400 dark:border-amber-500/40 dark:bg-amber-900/20"
                        : "border-transparent bg-slate-100/60 hover:border-slate-200 dark:bg-slate-800/40 dark:hover:border-slate-600"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${dayKeyShortLabel(key)}${isToday ? ", today" : ""}${isBest ? ", best day" : ""}, ${b.count} quizzes, ${b.totalScore} points`}
                >
                  {isBest && (
                    <span
                      className="absolute -top-1.5 text-xs leading-none drop-shadow-sm"
                      aria-hidden
                    >
                      👑
                    </span>
                  )}
                  <span className="text-[10px] font-medium leading-none text-slate-500 dark:text-slate-400">
                    {dayKeyShortLabel(key)}
                  </span>
                  <div className="flex h-24 w-full items-end justify-center px-0.5">
                    <motion.div
                      className={`w-full max-w-[2rem] rounded-t-md ${
                        isBest
                          ? "bg-gradient-to-t from-amber-500 to-amber-400 dark:from-amber-500 dark:to-amber-300"
                          : "bg-accent/85 dark:bg-accent"
                      }`}
                      initial={false}
                      animate={{ height: `${Math.max(h, b.count > 0 ? 8 : 4)}%` }}
                      transition={{ type: "spring", stiffness: 200, damping: 22 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {b.totalScore || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {activeBucket ? (
        <div
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/50"
          role="region"
          aria-label={`Sessions on ${selectedYmd}`}
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {dayKeyShortLabel(selectedYmd!)}
            <span className="ml-2 font-normal text-slate-500">
              · {activeBucket.count} quiz{activeBucket.count !== 1 ? "zes" : ""}{" "}
              · {activeBucket.totalScore} pts
              {activeBucket.avgPercentage != null
                ? ` · ${Math.round(activeBucket.avgPercentage)}%`
                : ""}
            </span>
          </p>
          {activeBucket.sessions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No quizzes this day.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeBucket.sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/40"
                >
                  <span className="min-w-0 flex-1 font-medium leading-snug">
                    {s.topic}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {Math.round(s.percentage)}% · {s.score} pts · {s.questionCount}{" "}
                    Q
                  </span>
                  <Link
                    href={`/dashboard/session/${s.id}`}
                    className="shrink-0 text-xs font-semibold text-accent underline"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : totals.sessionCount === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Complete a quiz to see your daily scores here. Each bar is total game
          points earned that calendar day.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Select a day above to list quizzes from that day.
        </p>
      )}

    </Card>
  );
}
