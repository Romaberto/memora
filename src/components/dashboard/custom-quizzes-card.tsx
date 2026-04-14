"use client";

import { useState } from "react";
import { WaitlistModal } from "./waitlist-modal";

/**
 * Custom-quizzes upsell.
 *
 * Needs a clear visual hook on the dashboard — the all-white version read
 * as dim filler. Solution: subtle emerald gradient surface + a "Coming
 * soon" pill in the accent color, which matches the landing-page eyebrow
 * convention. CTA is solid accent. No "Your turn." headline (rejected).
 */
export function CustomQuizzesCard({
  userEmail,
  alreadyOnWaitlist,
}: {
  userEmail: string | null;
  alreadyOnWaitlist: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(alreadyOnWaitlist);

  const bullets = [
    "Books, podcasts, lectures, your own notes",
    "Up to 50 questions per quiz",
    "Unlimited daily generations",
    "Beat your scores, climb the board",
  ];

  return (
    <section
      aria-label="Custom quizzes"
      className="relative overflow-hidden rounded-xl border border-[rgb(var(--accent)/0.18)] bg-gradient-to-br from-[rgb(var(--accent)/0.08)] via-[rgb(var(--accent)/0.03)] to-transparent p-6 shadow-[0_1px_2px_rgba(26,26,32,0.04)] sm:p-8"
    >
      {/* Accent stripe — ties the block back to the emerald accent language */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[rgb(var(--accent))]"
      />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--accent)/0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent-ink))]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
            Coming soon
          </span>

          <h3 className="mt-3 text-xl font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-2xl">
            Turn anything into a quiz.
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[rgb(var(--muted))]">
            Books, podcasts, lectures, your own notes. Paid plans launch soon,
            starting at{" "}
            <span className="font-semibold text-[rgb(var(--foreground))]">$9/mo</span>.
            The waitlist gets a launch-week discount.
          </p>

          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {bullets.map((b) => (
              <li
                key={b}
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
                <span>{b}</span>
              </li>
            ))}
          </ul>
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
            {joined ? "We’ll email you at launch." : "No spam. One email at launch."}
          </p>
        </div>
      </div>

      <WaitlistModal
        open={open}
        onClose={() => setOpen(false)}
        defaultEmail={userEmail}
        source="custom_quiz_gate"
        onJoined={() => setJoined(true)}
      />
    </section>
  );
}
