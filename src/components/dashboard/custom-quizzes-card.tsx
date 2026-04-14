"use client";

import { useState } from "react";
import { WaitlistModal } from "./waitlist-modal";

/**
 * Custom-quizzes upsell card for free users. Sells the paid-plan value prop
 * and opens a waitlist capture modal. Shows a persistent "you're on the
 * list" state if the user already joined, so the card keeps working as a
 * reminder without being pushy.
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
    "Books, podcasts, lectures, your notes",
    "Up to 50 questions per quiz",
    "Unlimited daily generations",
    "Beat your scores, climb the board",
  ];

  return (
    <section
      aria-label="Custom quizzes"
      className="overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] via-accent/[0.03] to-transparent p-5 shadow-sm dark:border-accent/40 dark:from-accent/[0.14]"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              Custom quizzes
            </p>
            <span className="rounded-full border border-accent/30 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent dark:bg-slate-900/60">
              Coming soon
            </span>
          </div>
          <h3 className="mt-1.5 text-lg font-bold leading-snug text-[rgb(var(--foreground))] sm:text-xl">
            Your turn.
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Turn anything you read, watch, or listen to into a quiz. Paid plans
            launch soon, starting at
            <span className="font-semibold text-[rgb(var(--foreground))]"> $9/mo</span>{" "}
            — the waitlist gets a launch-week discount.
          </p>

          <ul className="mt-3 space-y-1.5">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-56">
          {joined ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              ✓ You&apos;re on the waitlist
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-[0.98]"
            >
              Join the waitlist
            </button>
          )}
          <p className="text-center text-[11px] text-slate-400">
            {joined ? "We'll email you at launch." : "No spam. One email at launch."}
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
