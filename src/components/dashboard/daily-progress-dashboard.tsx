"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle } from "@/components/ui/card";
import {
  type ProgressGranularity,
  type SessionForDaily,
  bestBucketInPeriod,
  buildProgressBuckets,
  daysToGranularity,
  formatLocalYMD,
  maxScoreInBuckets,
  periodTotals,
  scrollHintText,
} from "@/lib/daily-progress";

type Tier = "free" | "builder" | "scholar" | "master";
type GranularityMode = "auto" | ProgressGranularity;

type Props = {
  sessions: SessionForDaily[];
  subscriptionTier: Tier;
};

type RangeOption = {
  days: number;
  label: string;
  tier: Tier;
};

const TIERS_IN_ORDER: Tier[] = ["free", "builder", "scholar", "master"];

const ALL_RANGE_OPTIONS: RangeOption[] = [
  { days: 7, label: "7d", tier: "free" },
  { days: 30, label: "30d", tier: "builder" },
  { days: 120, label: "120d", tier: "scholar" },
  { days: 365, label: "1y", tier: "master" },
];

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  builder: "Builder",
  scholar: "Scholar",
  master: "Master",
};

function tierAllowsRange(currentTier: Tier, requiredTier: Tier) {
  return TIERS_IN_ORDER.indexOf(currentTier) >= TIERS_IN_ORDER.indexOf(requiredTier);
}

function rangesForTier(tier: Tier) {
  return ALL_RANGE_OPTIONS.filter((range) => tierAllowsRange(tier, range.tier));
}

function getDefaultRangeDays(tier: Tier) {
  const ranges = rangesForTier(tier);
  return ranges.find((range) => range.days === 30)?.days ?? ranges[0]!.days;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function lastNDaysStart(days: number, endDate: Date) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

function inclusiveDayCount(startDate: Date, endDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (
    Math.floor((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / msPerDay) +
    1
  );
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatRangeSummary(startDate: Date, endDate: Date) {
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const startMonth = startDate.toLocaleString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleString("en-US", { month: "short" });

  if (sameMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  if (sameYear) {
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()}, ${startDate.getFullYear()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function chartHeadingForGranularity(granularity: ProgressGranularity) {
  if (granularity === "month") return "Monthly score (points)";
  if (granularity === "week") return "Weekly score (points)";
  return "Daily score (points)";
}

function chartCaptionForSelection(
  rangeDays: number,
  granularity: ProgressGranularity,
  usesPreset: boolean,
) {
  const scope =
    rangeDays >= 365 ? "year" : rangeDays === 1 ? "selected day" : `${rangeDays}-day range`;
  const cadence =
    granularity === "month"
      ? "month"
      : granularity === "week"
        ? "week"
        : "day";
  return usesPreset
    ? `Quick range selected. This view groups results by ${cadence}.`
    : `Custom ${scope}. This view groups results by ${cadence}.`;
}

function bucketWidthClass(granularity: ProgressGranularity) {
  if (granularity === "month") return "min-w-[4.25rem]";
  if (granularity === "week") return "min-w-[3.75rem]";
  return "min-w-[2.75rem]";
}

function getAllowedGranularities(rangeDays: number): ProgressGranularity[] {
  if (rangeDays <= 31) return ["day", "week"];
  if (rangeDays <= 180) return ["day", "week", "month"];
  return ["week", "month"];
}

export function DailyProgressDashboard({ sessions, subscriptionTier }: Props) {
  const availableRanges = rangesForTier(subscriptionTier);
  const defaultRange = getDefaultRangeDays(subscriptionTier);
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxHistoryDays = availableRanges[availableRanges.length - 1]!.days;
  const earliestDate = useMemo(
    () => lastNDaysStart(maxHistoryDays, today),
    [maxHistoryDays, today],
  );

  const initialStart = useMemo(
    () => lastNDaysStart(defaultRange, today),
    [defaultRange, today],
  );

  const [selectedPresetDays, setSelectedPresetDays] = useState<number | null>(defaultRange);
  const [rangeStart, setRangeStart] = useState<Date>(initialStart);
  const [rangeEnd, setRangeEnd] = useState<Date>(today);
  const [draftStart, setDraftStart] = useState(formatLocalYMD(initialStart));
  const [draftEnd, setDraftEnd] = useState(formatLocalYMD(today));
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [granularityMode, setGranularityMode] = useState<GranularityMode>("auto");
  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);

  const rangeDays = useMemo(
    () => inclusiveDayCount(rangeStart, rangeEnd),
    [rangeEnd, rangeStart],
  );
  const allowedGranularities = useMemo(
    () => getAllowedGranularities(rangeDays),
    [rangeDays],
  );
  const autoGranularity = useMemo(
    () => daysToGranularity(rangeDays),
    [rangeDays],
  );

  useEffect(() => {
    if (
      granularityMode !== "auto" &&
      !allowedGranularities.includes(granularityMode)
    ) {
      setGranularityMode("auto");
    }
  }, [allowedGranularities, granularityMode]);

  const effectiveGranularity =
    granularityMode === "auto" ? autoGranularity : granularityMode;

  const buckets = useMemo(
    () =>
      buildProgressBuckets(sessions, {
        startDate: rangeStart,
        endDate: rangeEnd,
        granularity: effectiveGranularity,
      }),
    [effectiveGranularity, rangeEnd, rangeStart, sessions],
  );
  const totals = useMemo(() => periodTotals(buckets), [buckets]);
  const maxBarScore = useMemo(() => maxScoreInBuckets(buckets), [buckets]);
  const best = useMemo(() => bestBucketInPeriod(buckets), [buckets]);
  const activeBucket = useMemo(
    () => buckets.find((bucket) => bucket.key === selectedBucketKey) ?? null,
    [buckets, selectedBucketKey],
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = chartRef.current;
    if (!element) return;
    setCanScrollLeft(element.scrollLeft > 4);
    setCanScrollRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    );
  }, []);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    requestAnimationFrame(() => {
      element.scrollLeft = element.scrollWidth;
      updateScrollState();
    });
  }, [buckets.length, updateScrollState]);

  function applyPreset(days: number) {
    const presetStart = lastNDaysStart(days, today);
    setSelectedPresetDays(days);
    setRangeStart(presetStart);
    setRangeEnd(today);
    setDraftStart(formatLocalYMD(presetStart));
    setDraftEnd(formatLocalYMD(today));
    setCustomRangeOpen(false);
    setDateError(null);
    setSelectedBucketKey(null);
  }

  function applyCustomRange() {
    const parsedStart = parseDateInput(draftStart);
    const parsedEnd = parseDateInput(draftEnd);

    if (!parsedStart || !parsedEnd) {
      setDateError("Choose a valid start and end date.");
      return;
    }
    if (parsedStart.getTime() < earliestDate.getTime()) {
      setDateError(`This plan supports up to ${maxHistoryDays} days of history.`);
      return;
    }
    if (parsedEnd.getTime() > today.getTime()) {
      setDateError("You can’t look ahead of today.");
      return;
    }
    if (parsedStart.getTime() > parsedEnd.getTime()) {
      setDateError("Start date must be before end date.");
      return;
    }

    const matchingPreset = availableRanges.find((range) => {
      return (
        parsedEnd.getTime() === today.getTime() &&
        inclusiveDayCount(parsedStart, parsedEnd) === range.days
      );
    });

    setSelectedPresetDays(matchingPreset?.days ?? null);
    setRangeStart(parsedStart);
    setRangeEnd(parsedEnd);
    setDateError(null);
    setSelectedBucketKey(null);
  }

  return (
    <Card>
      <div>
        <CardTitle>Progress</CardTitle>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Track points and accuracy over time. Use quick presets when you want
          speed, then switch to custom dates and a finer cadence when you want
          to inspect a stretch closely.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
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
              Best period{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {best.label}
              </span>{" "}
              · {best.totalScore} pts
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Quizzes played
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {totals.sessionCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {formatRangeSummary(rangeStart, rangeEnd)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Avg accuracy
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {totals.avgPercentage != null
              ? `${Math.round(totals.avgPercentage)}%`
              : "–"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {formatRangeSummary(rangeStart, rangeEnd)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {chartHeadingForGranularity(effectiveGranularity)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {chartCaptionForSelection(
                rangeDays,
                effectiveGranularity,
                selectedPresetDays != null,
              )}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {selectedPresetDays != null
                ? `Preset: last ${selectedPresetDays} days`
                : `Custom range · ${formatRangeSummary(rangeStart, rangeEnd)}`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div
                className="inline-flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60"
                role="group"
                aria-label="Date range presets"
              >
                {ALL_RANGE_OPTIONS.map((range) => {
                  const unlocked = tierAllowsRange(subscriptionTier, range.tier);
                  const selected = selectedPresetDays === range.days;
                  return (
                    <Link
                      key={range.days}
                      href={unlocked ? "#" : "/pricing"}
                      onClick={(event) => {
                        if (unlocked) {
                          event.preventDefault();
                          applyPreset(range.days);
                        }
                      }}
                      aria-disabled={!unlocked}
                      title={
                        unlocked
                          ? `Show the last ${range.days} days`
                          : `${TIER_LABELS[range.tier]} unlocks ${range.label} history`
                      }
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-[color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
                        selected
                          ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                          : unlocked
                            ? "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            : "text-slate-400 hover:bg-white/60 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{range.label}</span>
                      {!unlocked && (
                        <svg
                          aria-hidden
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="5" y="11" width="14" height="10" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div
                className="inline-flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60"
                role="group"
                aria-label="Chart granularity"
              >
                {(["auto", ...allowedGranularities] as GranularityMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGranularityMode(mode)}
                    className={`h-8 rounded-lg px-3 text-xs font-semibold capitalize transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                      granularityMode === mode
                        ? "bg-white text-accent shadow-sm dark:bg-slate-800 dark:text-accent"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {mode === "auto" ? "Auto" : mode}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCustomRangeOpen((open) => !open)}
                aria-expanded={customRangeOpen}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${
                  customRangeOpen || selectedPresetDays === null
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <svg
                  aria-hidden
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="3" />
                  <path d="M8 2v4M16 2v4M3 10h18" />
                </svg>
                Dates
              </button>
            </div>

            {customRangeOpen && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      From
                    </span>
                    <input
                      type="date"
                      min={formatLocalYMD(earliestDate)}
                      max={formatLocalYMD(today)}
                      value={draftStart}
                      onChange={(event) => setDraftStart(event.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-accent/20 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </label>

                  <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      To
                    </span>
                    <input
                      type="date"
                      min={formatLocalYMD(earliestDate)}
                      max={formatLocalYMD(today)}
                      value={draftEnd}
                      onChange={(event) => setDraftEnd(event.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-accent/20 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={applyCustomRange}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-[0.98]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {dateError ? (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {dateError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[18px] top-[14px] flex flex-col-reverse justify-between"
            aria-hidden
          >
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <div
                key={tick}
                className="h-px w-full bg-slate-200/70 dark:bg-slate-700/60"
              />
            ))}
          </div>

          {canScrollLeft && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-white to-transparent dark:from-slate-900"
              aria-hidden
            />
          )}
          {canScrollRight && (
            <div
              className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-slate-900"
              aria-hidden
            />
          )}

          <div
            ref={chartRef}
            onScroll={updateScrollState}
            className="relative flex gap-1.5 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {buckets.map((bucket) => {
              const height = Math.round((bucket.totalScore / maxBarScore) * 100);
              const isSelected = selectedBucketKey === bucket.key;
              const isBest =
                !!best && best.key === bucket.key && bucket.totalScore > 0;
              return (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() =>
                    setSelectedBucketKey((current) =>
                      current === bucket.key ? null : bucket.key,
                    )
                  }
                  className={`relative flex ${bucketWidthClass(effectiveGranularity)} flex-none flex-col items-center gap-1.5 rounded-xl border px-1 py-2 transition-[border-color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                    isSelected
                      ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                      : isBest
                        ? "border-amber-300/70 bg-amber-50/60 hover:border-amber-400 dark:border-amber-500/40 dark:bg-amber-900/20"
                        : "border-transparent bg-slate-100/60 hover:border-slate-200 dark:bg-slate-800/40 dark:hover:border-slate-600"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${bucket.ariaLabel}${bucket.isCurrent ? ", current period" : ""}${isBest ? ", best period" : ""}, ${bucket.count} quizzes, ${bucket.totalScore} points`}
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
                    {bucket.label}
                  </span>
                  <div className="flex h-24 w-full items-end justify-center px-0.5">
                    <motion.div
                      className={`w-full max-w-[2.4rem] rounded-t-md ${
                        isBest
                          ? "bg-gradient-to-t from-amber-500 to-amber-400 dark:from-amber-500 dark:to-amber-300"
                          : "bg-accent/85 dark:bg-accent"
                      }`}
                      initial={false}
                      animate={{
                        height: `${Math.max(height, bucket.count > 0 ? 8 : 4)}%`,
                      }}
                      transition={{ type: "spring", stiffness: 200, damping: 22 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {bucket.totalScore || "–"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeBucket ? (
        <div
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/50"
          role="region"
          aria-label={`Sessions in ${activeBucket.ariaLabel}`}
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {activeBucket.ariaLabel}
            <span className="ml-2 font-normal text-slate-500">
              · {activeBucket.count} quiz{activeBucket.count !== 1 ? "zes" : ""} ·{" "}
              {activeBucket.totalScore} pts
              {activeBucket.avgPercentage != null
                ? ` · ${Math.round(activeBucket.avgPercentage)}%`
                : ""}
            </span>
          </p>
          {activeBucket.sessions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No quizzes in this period.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeBucket.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/40"
                >
                  <span className="min-w-0 flex-1 font-medium leading-snug">
                    {session.topic}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {Math.round(session.percentage)}% · {session.score} pts ·{" "}
                    {session.questionCount} Q
                  </span>
                  <Link
                    href={`/dashboard/session/${session.id}`}
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
          Complete a quiz to populate this chart. Your history window will fill
          in automatically as you play.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {scrollHintText(effectiveGranularity)}
        </p>
      )}
    </Card>
  );
}
