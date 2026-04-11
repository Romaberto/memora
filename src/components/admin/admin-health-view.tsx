"use client";

/**
 * Live ops dashboard. Polls /api/admin/health every 5s and renders:
 *   - DB + Redis status pills with latency
 *   - traffic counters (5m / 1h / 24h / today)
 *   - per-minute sparkline of the last hour
 *   - peak rate + active users + average score
 *
 * The polling interval is intentionally aggressive — only admins see this and
 * the endpoint is cheap. Pause polling on tab blur to avoid pointless writes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";

type Health = {
  timestamp: string;
  db: { ok: boolean; configured: boolean; latencyMs: number | null; error?: string };
  redis: { ok: boolean; configured: boolean; latencyMs: number | null; error?: string };
  metrics: {
    usersTotal: number | null;
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

const POLL_MS = 5000;

export function AdminHealthView() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const inFlight = useRef(false);

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

  useEffect(() => {
    void fetchOnce();
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchOnce]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => void fetchOnce(), POLL_MS);
    return () => clearInterval(id);
  }, [paused, fetchOnce]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Live ops
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {paused
              ? "Paused — switch back to this tab to resume polling."
              : `Polling every ${POLL_MS / 1000}s · ${
                  lastUpdate
                    ? `updated ${Math.max(0, Math.round((Date.now() - lastUpdate) / 1000))}s ago`
                    : "loading…"
                }`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchOnce()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Refresh now
        </button>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Health row */}
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

      {/* Traffic counters */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Quizzes · last 5m" value={data?.metrics.quizzes5m} accent />
        <Metric label="Quizzes · last 1h" value={data?.metrics.quizzes1h} />
        <Metric label="Quizzes · last 24h" value={data?.metrics.quizzes24h} />
        <Metric label="Quizzes · today" value={data?.metrics.quizzesToday} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Users · total" value={data?.metrics.usersTotal} />
        <Metric label="Active users · 24h" value={data?.metrics.activeUsers24h} />
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

      {/* Sparkline */}
      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <CardTitle>Quiz generations · last hour</CardTitle>
          <span className="text-xs text-slate-500">
            peak {data ? Math.max(0, ...data.perMinuteLastHour) : 0}/min
          </span>
        </div>
        <Sparkline buckets={data?.perMinuteLastHour ?? new Array(60).fill(0)} />
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>60 min ago</span>
          <span>now</span>
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
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {label}
          </span>
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {latencyMs != null ? `${latencyMs} ms` : "—"}
      </div>
      <div className="mt-1 text-xs text-slate-500">round-trip latency</div>
      {errorMsg ? (
        <div className="mt-2 truncate text-xs text-rose-600 dark:text-rose-400" title={errorMsg}>
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
  const display = value == null ? "—" : typeof value === "number" ? value.toLocaleString() : value;
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 text-3xl font-bold tabular-nums ${
          accent ? "text-accent" : "text-slate-900 dark:text-white"
        }`}
      >
        {display}
      </div>
    </Card>
  );
}

function Sparkline({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets);
  return (
    <div className="mt-3 flex h-24 items-end gap-[2px]">
      {buckets.map((count, i) => {
        const heightPct = (count / max) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-accent/80 transition-[height] duration-300 ease-out"
            style={{ height: `${Math.max(2, heightPct)}%` }}
            title={`${count} at minute ${i - 59}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
