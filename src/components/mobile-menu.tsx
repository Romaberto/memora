"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MobileUser = {
  displayName: string;
  avatarUrl: string | null;
} | null;

export function MobileMenu({ user }: { user: MobileUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // Lock scroll + ESC-to-close while open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setOpen(false);
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--foreground))] transition-[background-color,transform] duration-150 ease-out hover:bg-black/5 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="13" x2="20" y2="13" />
              <line x1="4" y1="19" x2="20" y2="19" />
            </>
          )}
        </svg>
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        id="mobile-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-x-0 top-16 z-50 origin-top border-b border-[rgb(var(--border))] bg-[rgb(var(--background))] shadow-xl transition-[transform,opacity] duration-200 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={close}
                className="rounded-xl px-3 py-3 text-base font-medium text-[rgb(var(--foreground))] transition-colors duration-150 ease-out hover:bg-black/5"
              >
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                onClick={close}
                className="rounded-xl px-3 py-3 text-base font-medium text-[rgb(var(--foreground))] transition-colors duration-150 ease-out hover:bg-black/5"
              >
                Leaderboard
              </Link>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={signingOut}
                className="mt-1 rounded-xl px-3 py-3 text-left text-base font-medium text-rose-600 transition-colors duration-150 ease-out hover:bg-rose-50 disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={close}
                className="rounded-xl px-3 py-3 text-base font-medium text-[rgb(var(--foreground))] transition-colors duration-150 ease-out hover:bg-black/5"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="mt-1 rounded-xl bg-accent px-3 py-3 text-center text-base font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-[0.97]"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
