"use client";

/**
 * Three research-backed metrics about retrieval practice.
 * Each number count-ups when the strip first scrolls into view.
 * Single shot, ease-out, ~900ms. Honors prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Metric = {
  /** Final numeric value */
  value: number;
  /** What goes before the number, e.g. "" or "" */
  prefix?: string;
  /** What goes after, e.g. "×", "%", "+" */
  suffix: string;
  label: string;
  source: string;
};

const METRICS: Metric[] = [
  {
    value: 2,
    suffix: "×",
    label: "remembered after a week vs passive re-reading",
    source: "Roediger & Karpicke, Psych. Science 2006",
  },
  {
    value: 50,
    suffix: "%",
    label: "less forgetting compared to re-reading",
    source: "Roediger & Karpicke, Psych. Science 2006",
  },
  {
    value: 100,
    suffix: "+",
    label: "peer-reviewed studies behind retrieval practice",
    source: "Rowland 2014 meta-analysis",
  },
];

function useCountUp(target: number, run: boolean, durationMs = 900) {
  const [n, setN] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!run) return;
    function tick(ts: number) {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setN(target * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setN(target);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [run, target, durationMs]);

  return n;
}

function MetricCard({
  metric,
  inView,
  delayMs,
  reduceMotion,
}: {
  metric: Metric;
  inView: boolean;
  delayMs: number;
  reduceMotion: boolean;
}) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setRun(true);
      return;
    }
    const id = window.setTimeout(() => setRun(true), delayMs);
    return () => clearTimeout(id);
  }, [inView, delayMs, reduceMotion]);

  const value = useCountUp(metric.value, run && !reduceMotion);
  const display = reduceMotion
    ? metric.value
    : metric.value < 10
      ? value.toFixed(1).replace(/\.0$/, "")
      : Math.round(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: delayMs / 1000 }}
      className="flex flex-col items-center text-center sm:items-start sm:text-left"
    >
      <p className="flex items-baseline gap-0.5 text-3xl font-extrabold tracking-tight text-[rgb(var(--foreground))] sm:text-5xl lg:text-6xl">
        {metric.prefix}
        <span className="tabular-nums gradient-text">
          {run || reduceMotion ? display : 0}
        </span>
        <span className="gradient-text">{metric.suffix}</span>
      </p>
      <p className="mt-1.5 max-w-[16ch] text-[11px] font-medium leading-snug text-[rgb(var(--foreground))] sm:mt-2 sm:max-w-[18ch] sm:text-sm lg:text-base">
        {metric.label}
      </p>
      <p className="mt-1 hidden text-xs italic text-[rgb(var(--muted))] sm:block">
        {metric.source}
      </p>
    </motion.div>
  );
}

export function MetricStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className="border-y border-[rgb(var(--border))] bg-white py-8 sm:py-16">
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl grid-cols-3 gap-3 px-4 sm:gap-6 sm:px-6"
      >
        {METRICS.map((m, i) => (
          <MetricCard
            key={m.label}
            metric={m}
            inView={inView}
            delayMs={i * 120}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      {/* Combined mini citation under the strip on mobile only */}
      <p className="mx-auto mt-4 max-w-xs px-4 text-center text-[10px] italic leading-relaxed text-[rgb(var(--muted))] sm:hidden">
        Sources: Roediger &amp; Karpicke, Psych. Science 2006 · Rowland 2014 meta-analysis
      </p>
    </section>
  );
}
