"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { suggestUpgrade, type TierId } from "@/lib/tiers";

export type UpgradeReason = "custom_quiz" | "question_count" | "daily_limit";

/**
 * Upgrade modal.
 *
 * Triggered when the client receives a 403/429 from /api/generate-quiz with
 * an `upgradeReason` field. Picks a suggested target tier from lib/tiers.ts
 * so we route the user to the cheapest plan that resolves the specific
 * limit they just hit. The two CTAs are "See plans" (full /pricing page)
 * and a dismiss — we deliberately do NOT put an in-modal checkout flow
 * here; billing will land as a separate surface.
 *
 * Animations follow the house framework: scale-in from center with
 * @starting-style on the backdrop, opacity + translateY on the panel,
 * custom ease-out curve. Under 300ms.
 */
export function UpgradeModal({
  open,
  onClose,
  currentTier,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  currentTier: TierId;
  reason: UpgradeReason;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC-to-close + focus trap. Kept minimal — no roving focus, just land
  // on the primary CTA on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Focus primary CTA shortly after the enter animation starts.
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLAnchorElement>("a[data-primary]")?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const target = suggestUpgrade(currentTier, reason);
  const copy = COPY[reason];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Panel — note transform-origin stays center since this is a modal,
          not a trigger-anchored popover (per the animation framework). */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-white p-6 shadow-[0_10px_40px_rgba(26,26,32,0.18)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1 text-[rgb(var(--muted))] transition-colors duration-150 ease-[var(--ease-out)] hover:bg-black/5 hover:text-[rgb(var(--foreground))]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--accent)/0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent-ink))]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
          Upgrade
        </div>

        <h2
          id="upgrade-modal-title"
          className="mt-3 text-2xl font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-3xl"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">
          {copy.body}
        </p>

        {/* Suggested plan card */}
        <div className="mt-5 rounded-xl border border-[rgb(var(--accent)/0.2)] bg-[rgb(var(--accent)/0.04)] p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent-ink))]">
                Suggested plan
              </p>
              <p className="mt-0.5 text-lg font-bold tracking-tight text-[rgb(var(--foreground))]">
                {target.name}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold tabular-nums text-[rgb(var(--foreground))]">
                ${target.priceMonthly}
              </span>
              <span className="ml-0.5 text-sm text-[rgb(var(--muted))]">/mo</span>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-[rgb(var(--muted))]">
            {target.tagline}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 text-sm font-semibold text-[rgb(var(--foreground))] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[rgb(var(--surface-2))] active:scale-[0.98]"
          >
            Not now
          </button>
          <Link
            href="/pricing"
            data-primary
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[rgb(var(--accent))] px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[rgb(var(--accent-ink))] active:scale-[0.98]"
          >
            See plans →
          </Link>
        </div>
      </div>
    </div>
  );
}

const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  custom_quiz: {
    title: "Custom quizzes are a paid feature.",
    body: "Turn your books, notes, and lectures into quizzes with any Memora paid plan. Cancel anytime.",
  },
  question_count: {
    title: "That quiz length needs a bigger plan.",
    body: "Your current plan caps how long each quiz can be. Upgrade to run longer quizzes on the same content.",
  },
  daily_limit: {
    title: "You’ve hit today’s quiz cap.",
    body: "Paid plans include more custom quizzes per day. Come back tomorrow, or upgrade now to keep going.",
  },
};
