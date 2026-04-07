export type SessionForDaily = {
  id: string;
  score: number;
  percentage: number;
  questionCount: number;
  createdAt: string;
  topic: string;
};

export type DayBucket = {
  sessions: SessionForDaily[];
  totalScore: number;
  /** Average accuracy across sessions that day, null if none */
  avgPercentage: number | null;
  count: number;
};

export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAY_SHORT_EN = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * Human label for a calendar `YYYY-MM-DD` key. Fixed English + explicit order so
 * SSR and browser match (avoids `toLocaleDateString` locale ordering drift).
 */
export function dayKeyShortLabel(ymd: string): string {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d)
  ) {
    return ymd;
  }
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const wd = WEEKDAY_SHORT_EN[new Date(utcNoon).getUTCDay()];
  return `${wd} ${d}`;
}

/** Oldest → newest (today last). */
export function lastNDayKeys(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (n - 1 - i));
    out.push(formatLocalYMD(d));
  }
  return out;
}

export function buildDayBuckets(
  sessions: SessionForDaily[],
  dayKeys: string[],
): Map<string, DayBucket> {
  const lists = new Map<string, SessionForDaily[]>();
  for (const key of dayKeys) lists.set(key, []);

  for (const s of sessions) {
    const key = formatLocalYMD(new Date(s.createdAt));
    const bucket = lists.get(key);
    if (bucket) bucket.push(s);
  }

  const out = new Map<string, DayBucket>();
  for (const key of dayKeys) {
    const list = lists.get(key) ?? [];
    const totalScore = list.reduce((a, x) => a + x.score, 0);
    const avgPercentage =
      list.length === 0
        ? null
        : list.reduce((a, x) => a + x.percentage, 0) / list.length;
    out.set(key, {
      sessions: list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      totalScore,
      avgPercentage,
      count: list.length,
    });
  }
  return out;
}

export function periodTotals(
  dayKeys: string[],
  buckets: Map<string, DayBucket>,
): {
  sessionCount: number;
  totalScore: number;
  avgPercentage: number | null;
} {
  let sessionCount = 0;
  let totalScore = 0;
  let pctWeighted = 0;

  for (const k of dayKeys) {
    const b = buckets.get(k);
    if (!b) continue;
    sessionCount += b.count;
    totalScore += b.totalScore;
    if (b.count > 0 && b.avgPercentage != null) {
      pctWeighted += b.avgPercentage * b.count;
    }
  }

  return {
    sessionCount,
    totalScore,
    avgPercentage:
      sessionCount === 0 ? null : pctWeighted / sessionCount,
  };
}

export function bestDayInPeriod(
  dayKeys: string[],
  buckets: Map<string, DayBucket>,
): { key: string; totalScore: number } | null {
  let best: { key: string; totalScore: number } | null = null;
  for (const k of dayKeys) {
    const b = buckets.get(k);
    if (!b || b.totalScore === 0) continue;
    if (!best || b.totalScore > best.totalScore) {
      best = { key: k, totalScore: b.totalScore };
    }
  }
  return best;
}
