"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured yet. Please use email and password.",
  google_denied: "You cancelled the Google sign-in.",
  google_missing_params: "Google didn't return a valid response. Please try again.",
  google_session_expired: "That sign-in attempt expired. Please try again.",
  google_state_mismatch: "Sign-in security check failed. Please try again.",
  google_token_failed: "Couldn't verify your Google account. Please try again.",
  google_userinfo_failed: "Couldn't load your Google profile. Please try again.",
  google_email_unverified: "Your Google email isn't verified. Use a verified Google account or sign in with email and password.",
  google_rate_limited: "Too many Google sign-in attempts. Please wait a moment and try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Surface OAuth error codes coming back from /api/auth/google/callback.
  useEffect(() => {
    const code = searchParams?.get("error");
    if (code && OAUTH_ERROR_MESSAGES[code]) {
      setError(OAUTH_ERROR_MESSAGES[code]);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Login failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in to your Memora account
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <GoogleSignInButton />

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                or
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent underline">
          Register
        </Link>
      </p>
    </div>
  );
}
