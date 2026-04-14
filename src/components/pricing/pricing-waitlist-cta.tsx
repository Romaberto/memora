"use client";

import { useState } from "react";
import { WaitlistModal } from "@/components/dashboard/waitlist-modal";

/**
 * General "Join the waitlist" block for /pricing.
 *
 * Reuses the same `WaitlistModal` + `/api/waitlist` plumbing the dashboard
 * upsell uses — one mailing list, one backend, no tier selection. The only
 * thing we change is `source="pricing_page"` so we can segment signups in
 * analytics without splitting the waitlist table.
 */
export function PricingWaitlistCta({
  userEmail,
  alreadyOnWaitlist,
}: {
  userEmail: string | null;
  alreadyOnWaitlist: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(alreadyOnWaitlist);

  return (
    <section
      aria-label="Join the waitlist"
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--accent)/0.2)] bg-gradient-to-br from-[rgb(var(--accent)/0.08)] via-[rgb(var(--accent)/0.03)] to-transparent p-6 shadow-[0_1px_2px_rgba(26,26,32,0.04)] sm:p-8"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[rgb(var(--accent))]"
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--accent)/0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent-ink))]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]"
            />
            Paid plans launching soon
          </span>

          <h3 className="mt-3 text-xl font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-2xl">
            Get the launch-week discount.
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[rgb(var(--muted))]">
            Leave your email and we’ll ping you the moment custom quizzes go
            live — with a discount only the waitlist gets. One email. No spam.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-56">
          {joined ? (
            <div className="rounded-xl border border-[rgb(var(--accent)/0.2)] bg-white px-4 py-3 text-center text-sm">
              <span className="font-semibold text-[rgb(var(--accent-ink))]">
                You’re on the list.
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(var(--accent))] px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[rgb(var(--accent-ink))] active:scale-[0.98]"
            >
              Join the waitlist
            </button>
          )}
          <p className="text-center text-[11px] text-[rgb(var(--muted))]">
            {joined
              ? "We’ll email you at launch."
              : "One email at launch. That’s it."}
          </p>
        </div>
      </div>

      <WaitlistModal
        open={open}
        onClose={() => setOpen(false)}
        defaultEmail={userEmail}
        source="pricing_page"
        onJoined={() => setJoined(true)}
      />
    </section>
  );
}
