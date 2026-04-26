"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";

type Health = {
  timestamp: string;
  db: { ok: boolean; configured: boolean; latencyMs: number | null; error?: string };
  dbRuntime: {
    configured: boolean;
    protocol: string | null;
    host: string | null;
    hostKind: "pooler" | "direct" | "unknown" | null;
    database: string | null;
    pooled: boolean | null;
    connectionLimit: number | null;
    sslMode: string | null;
  };
  redis: { ok: boolean; configured: boolean; latencyMs: number | null; error?: string };
  generationCapacity: {
    configured: boolean;
    enabled: boolean;
    limit: number | null;
    ttlSeconds: number | null;
    inFlight: number | null;
    saturated: boolean | null;
    error?: string;
  };
  generationTelemetry: {
    configured: boolean;
    last5mCount: number | null;
    successCount: number | null;
    fallbackCount: number | null;
    capacityRejectedCount: number | null;
    persistErrorCount: number | null;
    providerErrorCount: number | null;
    avgTotalMs: number | null;
    avgAiMs: number | null;
    avgPersistMs: number | null;
    p95TotalMs: number | null;
  };
  metrics: {
    usersTotal: number | null;
    usersToday: number | null;
    usersThisWeek: number | null;
    usersThisMonth: number | null;
    quizzesToday: number | null;
    quizzes5m: number | null;
    quizzes1h: number | null;
    quizzes24h: number | null;
    sessions24h: number | null;
    activeUsers24h: number | null;
    avgScore24h: number | null;
  };
  perMinuteLastHour: number[];
};

type SeriesPoint = {
  date: string;
  count: number;
};

type Analytics = {
  from: string;
  to: string;
  days: number;
  maxDays: number;
  signups: { total: number; series: SeriesPoint[] };
  quizzesGenerated: { total: number; series: SeriesPoint[] };
  sessionsPlayed: { total: number; series: SeriesPoint[] };
  visitors: {
    available: boolean;
    trackingEnabled: boolean;
    total: number | null;
    series: SeriesPoint[];
    reason: string;
  };
};

type InteractivePoint = {
  label: string;
  count: number;
};

const POLL_MS = 5000;
const QUICK_RANGES = [7, 30, 60, 90, 120, 360] as const;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function inclusiveDayCount(startDate: Date, endDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (
    Math.floor((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / msPerDay) +
    1
  );
}

function buildPresetRange(days: number, today: Date) {
  const end = startOfDay(today);
  const start = addDays(end, -(days - 1));
  return {
    from: formatDateInput(start),
    to: formatDateInput(end),
  };
}

function formatDayLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRangeSummary(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const startMonth = start.toLocaleString("en-US", { month: "short" });
  const endMonth = end.toLocaleString("en-US", { month: "short" });

  if (sameMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

function metricDisplay(value: number | string | null | undefined) {
  if (value == null) return "–";
  return typeof value === "number" ? value.toLocaleString() : value;
}

export function AdminHealthView() {
  const [data, setData] = useState<Health | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const inFlight = useRef(false);
  const analyticsInFlight = useRef(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const initialRange = useMemo(() => buildPresetRange(30, today), [today]);
  const [selectedPresetDays, setSelectedPresetDays] = useState<number | null>(30);
  const [rangeFrom, setRangeFrom] = useState(initialRange.from);
  const [rangeTo, setRangeTo] = useState(initialRange.to);
  const [draftFrom, setDraftFrom] = useState(initialRange.from);
  const [draftTo, setDraftTo] = useState(initialRange.to);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as Health;
      setData(json);
      setError(null);
      setLastUpdate(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      inFlight.current = false;
    }
  }, []);

  const fetchAnalytics = useCallback(async (from: string, to: string) => {
    if (analyticsInFlight.current) return;
    analyticsInFlight.current = true;
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setAnalyticsError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as Analytics;
      setAnalytics(json);
      setAnalyticsError(null);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      analyticsInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchOnce();
    void fetchAnalytics(rangeFrom, rangeTo);
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchAnalytics, fetchOnce, rangeFrom, rangeTo]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => void fetchOnce(), POLL_MS);
    return () => clearInterval(id);
  }, [paused, fetchOnce]);

  const minutePoints = useMemo<InteractivePoint[]>(
    () =>
      (data?.perMinuteLastHour ?? new Array(60).fill(0)).map((count, index, arr) => ({
        label:
          index === arr.length - 1
            ? "now"
            : `${arr.length - 1 - index} min ago`,
        count,
      })),
    [data?.perMinuteLastHour],
  );

  function applyPreset(days: number) {
    const range = buildPresetRange(days, today);
    setSelectedPresetDays(days);
    setRangeFrom(range.from);
    setRangeTo(range.to);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setDateError(null);
    setCustomRangeOpen(false);
  }

  function applyCustomRange() {
    const parsedFrom = parseDateInput(draftFrom);
    const parsedTo = parseDateInput(draftTo);

    if (!parsedFrom || !parsedTo) {
      setDateError("Choose a valid start and end date.");
      return;
    }
    if (parsedFrom.getTime() > parsedTo.getTime()) {
      setDateError("Start date must be before end date.");
      return;
    }
    const days = inclusiveDayCount(parsedFrom, parsedTo);
    if (days > 360) {
      setDateError("Keep the range within 360 days.");
      return;
    }
    if (parsedTo.getTime() > today.getTime()) {
      setDateError("You can’t look ahead of today.");
      return;
    }

    setSelectedPresetDays(
      parsedTo.getTime() === today.getTime()
        ? QUICK_RANGES.find((candidate) => candidate === days) ?? null
        : null,
    );
    setRangeFrom(draftFrom);
    setRangeTo(draftTo);
    setDateError(null);
  }

  const analyticsSummary =
    analytics != null
      ? `${analytics.days} days · ${formatRangeSummary(analytics.from, analytics.to)}`
      : "Loading analytics…";

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live ops</h1>
          <p className="mt-1 text-sm text-slate-500">
            {paused
              ? "Paused. Switch back to this tab to resume polling."
              : `Polling every ${POLL_MS / 1000}s · ${
                  lastUpdate
                    ? `updated ${Math.max(0, Math.round((Date.now() - lastUpdate) / 1000))}s ago`
                    : "loading…"
                }`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchAnalytics(rangeFrom, rangeTo)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh charts
          </button>
          <button
            type="button"
            onClick={() => void fetchOnce()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh now
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {analyticsError ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {analyticsError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatusCard
          name="Postgres"
          ok={data?.db.ok ?? null}
          configured={data?.db.configured ?? true}
          latencyMs={data?.db.latencyMs ?? null}
          errorMsg={data?.db.error}
        />
        <StatusCard
          name="Upstash Redis"
          ok={data?.redis.ok ?? null}
          configured={data?.redis.configured ?? true}
          latencyMs={data?.redis.latencyMs ?? null}
          errorMsg={data?.redis.error}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="DB host mode"
          value={
            data?.dbRuntime.hostKind
              ? data.dbRuntime.hostKind === "pooler"
                ? "pooler"
                : data.dbRuntime.hostKind
              : null
          }
          accent
        />
        <Metric label="DB connection limit" value={data?.dbRuntime.connectionLimit} />
        <Metric
          label="Quiz slots in flight"
          value={
            data?.generationCapacity.inFlight != null && data?.generationCapacity.limit != null
              ? `${data.generationCapacity.inFlight}/${data.generationCapacity.limit}`
              : data?.generationCapacity.configured
                ? "–"
                : "disabled"
          }
        />
        <Metric
          label="Generation gate"
          value={
            data?.generationCapacity.enabled
              ? data.generationCapacity.saturated
                ? "saturated"
                : "active"
              : "disabled"
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Gen avg total · 5m"
          value={
            data?.generationTelemetry.avgTotalMs != null
              ? `${Math.round(data.generationTelemetry.avgTotalMs)} ms`
              : null
          }
          accent
        />
        <Metric
          label="Gen avg AI · 5m"
          value={
            data?.generationTelemetry.avgAiMs != null
              ? `${Math.round(data.generationTelemetry.avgAiMs)} ms`
              : null
          }
        />
        <Metric
          label="Gen avg persist · 5m"
          value={
            data?.generationTelemetry.avgPersistMs != null
              ? `${Math.round(data.generationTelemetry.avgPersistMs)} ms`
              : null
          }
        />
        <Metric
          label="Gen p95 total · 5m"
          value={
            data?.generationTelemetry.p95TotalMs != null
              ? `${Math.round(data.generationTelemetry.p95TotalMs)} ms`
              : null
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Gen reqs · 5m" value={data?.generationTelemetry.last5mCount} accent />
        <Metric label="Gen success · 5m" value={data?.generationTelemetry.successCount} />
        <Metric label="Gate rejects · 5m" value={data?.generationTelemetry.capacityRejectedCount} />
        <Metric label="Persist errs · 5m" value={data?.generationTelemetry.persistErrorCount} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Quizzes · last 5m" value={data?.metrics.quizzes5m} accent />
        <Metric label="Quizzes · last 1h" value={data?.metrics.quizzes1h} />
        <Metric label="Quizzes · last 24h" value={data?.metrics.quizzes24h} />
        <Metric label="Quizzes · today" value={data?.metrics.quizzesToday} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Registered users" value={data?.metrics.usersTotal} accent />
        <Metric label="New users · today" value={data?.metrics.usersToday} />
        <Metric label="New users · 7d" value={data?.metrics.usersThisWeek} />
        <Metric label="New users · 30d" value={data?.metrics.usersThisMonth} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Metric label="Active users · 24h" value={data?.metrics.activeUsers24h} accent />
        <Metric label="Sessions played · 24h" value={data?.metrics.sessions24h} />
        <Metric
          label="Avg score · 24h"
          value={
            data?.metrics.avgScore24h != null
              ? `${Math.round(data.metrics.avgScore24h)}%`
              : null
          }
        />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Quiz generations · last hour</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Hover the line to inspect the minute-by-minute load without leaving the page.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            peak {data ? Math.max(0, ...data.perMinuteLastHour) : 0}/min
          </span>
        </div>
        <div className="mt-4">
          <InteractiveChart
            points={minutePoints}
            yLabel="quizzes/min"
            emptyMessage="No quiz generations in the last hour."
          />
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>60 min ago</span>
            <span>now</span>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Historical dashboards</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Explore signups, quizzes, and sessions over longer windows without hammering the
              live-ops endpoint.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{analyticsSummary}</p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div
                className="inline-flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
                role="group"
                aria-label="Historical date range presets"
              >
                {QUICK_RANGES.map((days) => {
                  const selected = selectedPresetDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => applyPreset(days)}
                      className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 ease-out ${
                        selected
                          ? "bg-white text-accent shadow-sm"
                          : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                      }`}
                    >
                      {days}d
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCustomRangeOpen((open) => !open)}
                aria-expanded={customRangeOpen}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${
                  customRangeOpen || selectedPresetDays === null
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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

            {customRangeOpen ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-500">From</span>
                    <input
                      type="date"
                      value={draftFrom}
                      max={formatDateInput(today)}
                      onChange={(event) => setDraftFrom(event.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-accent/20 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:ring-2"
                    />
                  </label>

                  <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-500">To</span>
                    <input
                      type="date"
                      value={draftTo}
                      max={formatDateInput(today)}
                      onChange={(event) => setDraftTo(event.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-accent/20 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:ring-2"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={applyCustomRange}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-[0.98]"
                  >
                    Apply range
                  </button>
                </div>
                {dateError ? (
                  <p className="mt-2 text-[11px] font-medium text-rose-600">{dateError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <TrendCard
            title="Signups over time"
            subtitle="New accounts created in the selected range."
            total={analytics?.signups.total ?? null}
            unit="signups"
            points={(analytics?.signups.series ?? []).map((point) => ({
              label: formatDayLabel(point.date),
              count: point.count,
            }))}
          />

          <TrendCard
            title="Quizzes generated over time"
            subtitle="Real AI quiz requests only, fallback samples excluded."
            total={analytics?.quizzesGenerated.total ?? null}
            unit="quizzes"
            points={(analytics?.quizzesGenerated.series ?? []).map((point) => ({
              label: formatDayLabel(point.date),
              count: point.count,
            }))}
          />

          <TrendCard
            title="Sessions played over time"
            subtitle="Completed quiz sessions created in the selected range."
            total={analytics?.sessionsPlayed.total ?? null}
            unit="sessions"
            points={(analytics?.sessionsPlayed.series ?? []).map((point) => ({
              label: formatDayLabel(point.date),
              count: point.count,
            }))}
          />

          <VisitorsPlaceholderCard visitors={analytics?.visitors ?? null} />
        </div>
      </Card>
    </div>
  );
}

function StatusCard({
  name,
  ok,
  configured,
  latencyMs,
  errorMsg,
}: {
  name: string;
  ok: boolean | null;
  configured: boolean;
  latencyMs: number | null;
  errorMsg?: string;
}) {
  let label: string;
  let dotClass: string;
  if (!configured) {
    label = "Not configured";
    dotClass = "bg-slate-300";
  } else if (ok == null) {
    label = "Checking…";
    dotClass = "bg-slate-300";
  } else if (ok) {
    label = "Healthy";
    dotClass = "bg-emerald-500";
  } else {
    label = "Down";
    dotClass = "bg-rose-500";
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{name}</CardTitle>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
          <span className="text-xs font-medium text-slate-600">{label}</span>
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
        {latencyMs != null ? `${latencyMs} ms` : "–"}
      </div>
      <div className="mt-1 text-xs text-slate-500">round-trip latency</div>
      {errorMsg ? (
        <div className="mt-2 truncate text-xs text-rose-600" title={errorMsg}>
          {errorMsg}
        </div>
      ) : null}
    </Card>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string | null | undefined;
  accent?: boolean;
}) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={`mt-2 text-3xl font-bold tabular-nums ${
          accent ? "text-accent" : "text-slate-900"
        }`}
      >
        {metricDisplay(value)}
      </div>
    </Card>
  );
}

function TrendCard({
  title,
  subtitle,
  total,
  unit,
  points,
}: {
  title: string;
  subtitle: string;
  total: number | null;
  unit: string;
  points: InteractivePoint[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {metricDisplay(total)}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{unit}</p>
        </div>
      </div>

      <div className="mt-4">
        <InteractiveChart points={points} yLabel={unit} emptyMessage={`No ${unit} in this range.`} />
      </div>
    </div>
  );
}

function VisitorsPlaceholderCard({
  visitors,
}: {
  visitors: Analytics["visitors"] | null;
}) {
  const title = visitors?.trackingEnabled
    ? "Client-side tracking is on"
    : "No visitor source yet";

  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Website visitors over time</p>
          <p className="mt-1 text-xs text-slate-500">
            We need a server-side analytics source before this chart can be trusted.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
          pending
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {visitors?.reason ??
            "Add a historical visitor analytics source and this slot can use the same controls as the other charts."}
        </p>
      </div>
    </div>
  );
}

function InteractiveChart({
  points,
  yLabel,
  emptyMessage,
}: {
  points: InteractivePoint[];
  yLabel: string;
  emptyMessage: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const safePoints = points.length > 0 ? points : [{ label: "No data", count: 0 }];
  const max = Math.max(1, ...safePoints.map((point) => point.count));
  const width = 100;
  const height = 44;
  const chartTop = 4;
  const chartBottom = 36;
  const chartLeft = 2;
  const chartRight = 98;
  const xStep = safePoints.length > 1 ? (chartRight - chartLeft) / (safePoints.length - 1) : 0;

  const coords = safePoints.map((point, index) => {
    const x = chartLeft + index * xStep;
    const y = chartBottom - (point.count / max) * (chartBottom - chartTop);
    return { x, y, count: point.count, label: point.label };
  });

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x} ${chartBottom} L ${coords[0]!.x} ${chartBottom} Z`;

  const active =
    activeIndex != null && coords[activeIndex] ? coords[activeIndex] : coords[coords.length - 1]!;

  function updateActiveIndex(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || coords.length === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (coords.length - 1));
    setActiveIndex(index);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">{active.count}</p>
          <p className="text-xs uppercase tracking-wider text-slate-400">{yLabel}</p>
        </div>
        <p className="text-xs font-medium text-slate-500">{active.label}</p>
      </div>

      <div
        className="relative h-40 rounded-xl border border-slate-200 bg-white px-2 py-3"
        onMouseMove={(event) => updateActiveIndex(event.clientX)}
        onMouseLeave={() => setActiveIndex(null)}
        onTouchStart={(event) => updateActiveIndex(event.touches[0]!.clientX)}
        onTouchMove={(event) => updateActiveIndex(event.touches[0]!.clientX)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
          {[0, 0.33, 0.66, 1].map((tick) => {
            const y = chartBottom - tick * (chartBottom - chartTop);
            return (
              <line
                key={tick}
                x1={chartLeft}
                x2={chartRight}
                y1={y}
                y2={y}
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="0.4"
              />
            );
          })}

          <path d={areaPath} fill="rgba(16, 185, 129, 0.12)" />
          <path d={linePath} fill="none" stroke="rgba(16, 185, 129, 0.95)" strokeWidth="1.5" />

          {coords.map((coord, index) => (
            <circle
              key={`${coord.label}-${index}`}
              cx={coord.x}
              cy={coord.y}
              r={activeIndex == null ? (index === coords.length - 1 ? 1.6 : 0.9) : index === activeIndex ? 2 : 0.9}
              fill={activeIndex != null && index === activeIndex ? "rgba(15, 23, 42, 1)" : "rgba(16, 185, 129, 1)"}
            />
          ))}

          {active ? (
            <line
              x1={active.x}
              x2={active.x}
              y1={chartTop}
              y2={chartBottom}
              stroke="rgba(15, 23, 42, 0.22)"
              strokeWidth="0.6"
              strokeDasharray="1.6 1.6"
            />
          ) : null}
        </svg>
      </div>

      {points.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>{points[0]?.label}</span>
          <span>{points[points.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}
