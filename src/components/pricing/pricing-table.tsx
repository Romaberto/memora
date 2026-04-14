"use client";

import Link from "next/link";
import { useState } from "react";
import { TIERS_IN_ORDER, getAnnualPrice, type Tier } from "@/lib/tiers";

type Billing = "monthly" | "annual";

/**
 * Pricing table.
 *
 * Four cards in a 4-col grid on desktop, stacked on mobile. The middle tier
 * (`scholar`) is the anchor — its `highlight` flag is read from tiers.ts and
 * translates to a green ring + "Best value" eyebrow.
 *
 * Billing toggle renders annual prices as `$priceMonthly * 10` (2 months free).
 * That math stays in lib/tiers.ts so we can re-price without touching UI.
 */
export function PricingTable({
  currentTier,
}: {
  currentTier: string | null;
}) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div>
      {/* Billing toggle — emerald-tinted segmented control, reuses the
          accent-ink hover convention from the rest of the app. */}
      <div className="mx-auto mb-10 flex w-fit items-center gap-0.5 rounded-full border border-[rgb(var(--border))] bg-white p-1 shadow-[0_1px_2px_rgba(26,26,32,0.04)]">
        <BillingButton
          active={billing === "monthly"}
          onClick={() => setBilling("monthly")}
        >
          Monthly
        </BillingButton>
        <BillingButton
          active={billing === "annual"}
          onClick={() => setBilling("annual")}
        >
          Annual
          <span className="ml-1.5 rounded-full bg-[rgb(var(--accent)/0.14)] px-1.5 py-0.5 text-[10px] font-semibold text-[rgb(var(--accent-ink))]">
            −17%
          </span>
        </BillingButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TIERS_IN_ORDER.map((tier) => (
          <PricingCard
            key={tier.id}
            tier={tier}
            billing={billing}
            isCurrent={currentTier === tier.id}
          />
        ))}
      </div>
    </div>
  );
}

function BillingButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition-[background-color,color] duration-150 ease-[var(--ease-out)] ${
        active
          ? "bg-[rgb(var(--accent))] text-white shadow-sm"
          : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
      }`}
    >
      {children}
    </button>
  );
}

function PricingCard({
  tier,
  billing,
  isCurrent,
}: {
  tier: Tier;
  billing: Billing;
  isCurrent: boolean;
}) {
  const price =
    billing === "annual"
      ? Math.round(getAnnualPrice(tier) / 12)
      : tier.priceMonthly;

  const isFree = tier.priceMonthly === 0;
  const isHighlight = !!tier.highlight;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-[0_1px_2px_rgba(26,26,32,0.04)] ${
        isHighlight
          ? "border-[rgb(var(--accent)/0.3)] ring-2 ring-[rgb(var(--accent)/0.15)]"
          : "border-[rgb(var(--border))]"
      }`}
    >
      {isHighlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[rgb(var(--accent))] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-sm">
          Best value
        </span>
      )}

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
          {tier.name}
        </p>
        <p className="mt-2 text-sm text-[rgb(var(--foreground))]">
          {tier.tagline}
        </p>
      </header>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight tabular-nums text-[rgb(var(--foreground))]">
          ${price}
        </span>
        <span className="text-sm text-[rgb(var(--muted))]">
          {isFree ? "forever" : "/mo"}
        </span>
      </div>
      {!isFree && billing === "annual" && (
        <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
          billed ${getAnnualPrice(tier)} yearly · 2 months free
        </p>
      )}
      {!isFree && billing === "monthly" && (
        <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
          billed monthly · cancel anytime
        </p>
      )}

      <ul className="mt-5 flex-1 space-y-2.5">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm leading-relaxed text-[rgb(var(--foreground))]"
          >
            <svg
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--accent))]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <CardCta tier={tier} isCurrent={isCurrent} isFree={isFree} />
      </div>
    </article>
  );
}

function CardCta({
  isCurrent,
  isFree,
}: {
  tier: Tier;
  isCurrent: boolean;
  isFree: boolean;
}) {
  if (isCurrent) {
    return (
      <div className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.06)] px-4 text-sm font-semibold text-[rgb(var(--accent-ink))]">
        Current plan
      </div>
    );
  }

  // Free tier → sign up. Paid tiers → informational "Coming soon" chip,
  // not a button. The paid flow lives behind the dashboard's custom-quiz
  // card waitlist modal (one entry point, one email captured). Matching
  // the tiles here to the dashboard would double-book the same waitlist
  // capture and confuse users, so we step aside and let the dashboard own
  // that interaction.
  if (isFree) {
    return (
      <Link
        href="/register"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 text-sm font-semibold text-[rgb(var(--foreground))] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[rgb(var(--surface-2))] active:scale-[0.98]"
      >
        Start free
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 text-sm font-semibold text-[rgb(var(--muted))]"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
      Coming soon
    </div>
  );
}
