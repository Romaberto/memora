"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Waitlist modal — captures an email for the "custom quizzes coming soon"
 * signal. Focus is moved to the email input on open; ESC closes; backdrop
 * click closes; body scroll is locked while open. Success state shows a
 * confirmation and auto-closes after a short pause.
 */
export function WaitlistModal({
  open,
  onClose,
  defaultEmail,
  source = "custom_quiz_gate",
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string | null;
  source?: string;
  onJoined?: (email: string) => void;
}) {
  const [email, setEmail] = useState<string>(defaultEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail ?? "");
    setError(null);
    setDone(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // defer focus so animation doesn't steal it
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, defaultEmail, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Couldn't add you. Try again.");
        return;
      }
      setDone(true);
      onJoined?.(email.trim());
      window.setTimeout(() => onClose(), 1600);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join waitlist"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out"
      />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              Custom quizzes
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[rgb(var(--foreground))]">
              Be first to turn your notes into quizzes
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Leave your email and we&apos;ll ping you when paid plans launch.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-2 -mt-2 rounded-lg p-2 text-slate-400 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            You&apos;re on the list. We&apos;ll be in touch.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id="waitlist-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@work.com"
              className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 text-sm text-[rgb(var(--foreground))] outline-none ring-accent/30 focus:border-accent focus:ring-2 dark:bg-slate-900"
            />
            {error && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Joining…" : "Join the waitlist"}
            </button>
            <p className="text-[11px] text-slate-400">
              No spam. One email when it&apos;s ready.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
