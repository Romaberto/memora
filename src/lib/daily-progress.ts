export type SessionForDaily = {
  id: string;
  score: number;
  percentage: number;
  questionCount: number;
  createdAt: string;
  topic: string;
};

export type ProgressGranularity = "day" | "week" | "month";

export type ProgressBucket = {
  key: string;
  label: string;
  ariaLabel: string;
  sessions: SessionForDaily[];
  totalScore: number;
  avgPercentage: number | null;
  count: number;
  isCurrent: boolean;
};

type BucketWindow = {
  key: string;
  label: string;
  ariaLabel: string;
  start: Date;
  end: Date;
  isCurrent: boolean;
};

const WEEKDAY_SHORT_EN = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const MONTH_SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date): Date {
  return endOfLocalDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function fullDateLabel(date: Date): string {
  return `${MONTH_SHORT_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function dayShortLabel(date: Date): string {
  return `${WEEKDAY_SHORT_EN[date.getDay()]} ${date.getDate()}`;
}

function weekShortLabel(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${MONTH_SHORT_EN[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
  }
  return `${MONTH_SHORT_EN[start.getMonth()]} ${start.getDate()}`;
}

function monthShortLabel(date: Date): string {
  return `${MONTH_SHORT_EN[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
}

function monthLongLabel(date: Date): string {
  return `${MONTH_SHORT_EN[date.getMonth()]} ${date.getFullYear()}`;
}

function buildDayWindows(rangeStart: Date, rangeEnd: Date, today: Date): BucketWindow[] {
  const windows: BucketWindow[] = [];
  for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
    windows.push({
      key: formatLocalYMD(cursor),
      label: dayShortLabel(cursor),
      ariaLabel: fullDateLabel(cursor),
      start: startOfLocalDay(cursor),
      end: endOfLocalDay(cursor),
      isCurrent: cursor.getTime() === today.getTime(),
    });
  }
  return windows;
}

function buildWeekWindows(rangeStart: Date, rangeEnd: Date, today: Date): BucketWindow[] {
  const windows: BucketWindow[] = [];
  for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addDays(cursor, 7)) {
    const start = startOfLocalDay(cursor);
    const end = endOfLocalDay(minDate(addDays(start, 6), rangeEnd));
    windows.push({
      key: `${formatLocalYMD(start)}:${formatLocalYMD(end)}`,
      label: weekShortLabel(start, end),
      ariaLabel: `${fullDateLabel(start)} to ${fullDateLabel(end)}`,
      start,
      end,
      isCurrent:
        today.getTime() >= start.getTime() && today.getTime() <= end.getTime(),
    });
  }
  return windows;
}

function buildMonthWindows(rangeStart: Date, rangeEnd: Date, today: Date): BucketWindow[] {
  const windows: BucketWindow[] = [];
  for (
    let cursor = monthStart(rangeStart);
    cursor <= rangeEnd;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const start = maxDate(startOfLocalDay(cursor), rangeStart);
    const end = minDate(monthEnd(cursor), endOfLocalDay(rangeEnd));
    windows.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: monthShortLabel(cursor),
      ariaLabel: monthLongLabel(cursor),
      start,
      end,
      isCurrent:
        today.getTime() >= start.getTime() && today.getTime() <= end.getTime(),
    });
  }
  return windows;
}

export function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildProgressBuckets(
  sessions: SessionForDaily[],
  {
    startDate,
    endDate,
    granularity,
  }: {
    startDate: Date;
    endDate: Date;
    granularity: ProgressGranularity;
  },
): ProgressBucket[] {
  const today = startOfLocalDay(new Date());
  const rangeStart = startOfLocalDay(startDate);
  const rangeEnd = endOfLocalDay(endDate);
  const filteredSessions = sessions.filter((session) => {
    const createdAt = new Date(session.createdAt).getTime();
    return createdAt >= rangeStart.getTime() && createdAt <= rangeEnd.getTime();
  });

  const windows =
    granularity === "month"
      ? buildMonthWindows(rangeStart, rangeEnd, today)
      : granularity === "week"
        ? buildWeekWindows(rangeStart, rangeEnd, today)
        : buildDayWindows(rangeStart, rangeEnd, today);

  return windows.map((window) => {
    const bucketSessions = filteredSessions
      .filter((session) => {
        const createdAt = new Date(session.createdAt).getTime();
        return createdAt >= window.start.getTime() && createdAt <= window.end.getTime();
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const totalScore = bucketSessions.reduce((sum, session) => sum + session.score, 0);
    const avgPercentage =
      bucketSessions.length === 0
        ? null
        : bucketSessions.reduce((sum, session) => sum + session.percentage, 0) /
          bucketSessions.length;

    return {
      key: window.key,
      label: window.label,
      ariaLabel: window.ariaLabel,
      sessions: bucketSessions,
      totalScore,
      avgPercentage,
      count: bucketSessions.length,
      isCurrent: window.isCurrent,
    };
  });
}

export function periodTotals(buckets: ProgressBucket[]): {
  sessionCount: number;
  totalScore: number;
  avgPercentage: number | null;
} {
  let sessionCount = 0;
  let totalScore = 0;
  let pctWeighted = 0;

  for (const bucket of buckets) {
    sessionCount += bucket.count;
    totalScore += bucket.totalScore;
    if (bucket.count > 0 && bucket.avgPercentage != null) {
      pctWeighted += bucket.avgPercentage * bucket.count;
    }
  }

  return {
    sessionCount,
    totalScore,
    avgPercentage: sessionCount === 0 ? null : pctWeighted / sessionCount,
  };
}

export function bestBucketInPeriod(
  buckets: ProgressBucket[],
): { key: string; totalScore: number; label: string } | null {
  let best: { key: string; totalScore: number; label: string } | null = null;
  for (const bucket of buckets) {
    if (bucket.totalScore === 0) continue;
    if (!best || bucket.totalScore > best.totalScore) {
      best = {
        key: bucket.key,
        totalScore: bucket.totalScore,
        label: bucket.label,
      };
    }
  }
  return best;
}

export function daysToGranularity(days: number): ProgressGranularity {
  if (days >= 365) return "month";
  if (days >= 120) return "week";
  return "day";
}

export function maxScoreInBuckets(buckets: ProgressBucket[]): number {
  return buckets.reduce((max, bucket) => Math.max(max, bucket.totalScore), 1);
}

export function scrollHintText(granularity: ProgressGranularity): string {
  if (granularity === "month") return "Select a month above to review the quizzes from that month.";
  if (granularity === "week") return "Select a week above to review the quizzes from that stretch.";
  return "Select a day above to list quizzes from that day.";
}
