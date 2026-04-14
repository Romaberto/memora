"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { formatDurationHuman } from "@/lib/format-quiz-clock";
import type { League } from "@/lib/leagues";

// ─── types ────────────────────────────────────────────────────────────────────

type ProfileUser = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  avatarUrl: string;
  memberSince: string;
};

type ProfileStats = {
  totalSessions: number;
  avgPercentage: number | null;
  bestPercentage: number | null;
  totalPoints: number;
  sessionsLast7: number;
  sessionsLast30: number;
  maxStreak: number;
  avgSecondsPerQuestion: number | null;
};

type Props = { user: ProfileUser; stats: ProfileStats; league: League };

// ─── small helpers ────────────────────────────────────────────────────────────

function pct(n: number | null) {
  return n != null ? `${Math.round(n)}%` : "–";
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border px-3 py-3 ${
        accent
          ? "border-accent/40 bg-accent/[0.07] dark:bg-accent/[0.12]"
          : "border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span
        className={`mt-1 text-lg font-bold tabular-nums leading-snug ${
          accent ? "text-accent" : "text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </span>
      {sub && <span className="mt-0.5 text-[11px] text-slate-500">{sub}</span>}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ProfileView({ user, stats, league }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── avatar state
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // ── profile form state
  const [name, setName] = useState(user.name);
  const [nickname, setNickname] = useState(user.nickname);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── password form state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const displayName = nickname || name || user.email;

  // ── avatar upload ──────────────────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    // Local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setAvatarLoading(true);

    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) {
        setAvatarUrl(user.avatarUrl); // revert
        setAvatarError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      setAvatarUrl(typeof data.avatarUrl === "string" ? data.avatarUrl : localUrl);
      router.refresh();
    } finally {
      setAvatarLoading(false);
      URL.revokeObjectURL(localUrl);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    setAvatarError(null);
    try {
      await fetch("/api/profile/avatar", { method: "DELETE" });
      setAvatarUrl("");
      router.refresh();
    } finally {
      setAvatarLoading(false);
    }
  }

  // ── profile save ───────────────────────────────────────────────────────────

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), nickname: nickname.trim() }),
      });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) {
        setProfileMsg({ ok: false, text: typeof data.error === "string" ? data.error : "Save failed." });
        return;
      }
      setProfileMsg({ ok: true, text: "Profile updated." });
      router.refresh();
    } catch {
      setProfileMsg({ ok: false, text: "Network error." });
    } finally {
      setProfileSaving(false);
    }
  }

  // ── password change ────────────────────────────────────────────────────────

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) {
        setPwdMsg({ ok: false, text: typeof data.error === "string" ? data.error : "Update failed." });
        return;
      }
      setPwdMsg({ ok: true, text: "Password updated successfully." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      setPwdMsg({ ok: false, text: "Network error." });
    } finally {
      setPwdSaving(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const memberDate = user.memberSince
    ? new Date(user.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const pace = stats.avgSecondsPerQuestion != null
    ? formatDurationHuman(Math.round(stats.avgSecondsPerQuestion))
    : null;

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-accent/30 transition-[border-color,box-shadow] duration-150 ease-out focus:ring-2 dark:border-slate-700 dark:bg-slate-900";

  const msgCls = (ok: boolean) =>
    ok
      ? "flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:hover:text-white"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        </div>
        {/* Mini identity card */}
        <div className="hidden items-center gap-3 sm:flex">
          <UserAvatar src={avatarUrl || null} name={displayName} size="md" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">{name || user.email}</p>
            <Link
              href="/leaderboard"
              className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity duration-150 ease-out hover:opacity-80 ${league.bg} ${league.color}`}
              title={`${stats.totalPoints.toLocaleString()} points`}
            >
              <span aria-hidden>{league.icon}</span>
              <span>{league.name}</span>
            </Link>
            {memberDate && (
              <p className="mt-0.5 text-xs text-slate-400">
                {nickname ? `@${nickname} · ` : ""}Member since {memberDate}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column grid ───────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">

        {/* LEFT COLUMN ───────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Edit profile card */}
          <Card>
            <CardTitle>Edit profile</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Your display name, handle, and photo.
            </p>

            {/* Avatar */}
            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="relative">
                <UserAvatar
                  src={avatarUrl || null}
                  name={displayName}
                  size="xl"
                  className={avatarLoading ? "opacity-60" : ""}
                />
                {/* Camera overlay button */}
                <label
                  htmlFor="avatar-file"
                  className={`absolute -bottom-1 -right-1 cursor-pointer rounded-full border-2 border-white bg-accent p-1.5 text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-95 dark:border-slate-900 ${
                    avatarLoading ? "pointer-events-none opacity-50" : ""
                  }`}
                  title="Change photo"
                >
                  <CameraIcon />
                </label>
                <input
                  id="avatar-file"
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => void handleAvatarChange(e)}
                />
              </div>

              {avatarLoading && (
                <p className="text-xs text-slate-500">Uploading…</p>
              )}
              {avatarError && (
                <p className="text-xs text-rose-600">{avatarError}</p>
              )}
              {avatarUrl && !avatarLoading && (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  className="text-xs text-slate-400 underline transition-colors duration-150 ease-out hover:text-rose-600"
                >
                  Remove photo
                </button>
              )}
              <p className="text-center text-[11px] text-slate-400">
                JPEG, PNG or WebP · max 2 MB
              </p>
            </div>

            {/* Profile form */}
            <form className="mt-5 space-y-4" onSubmit={(e) => void handleProfileSave(e)}>
              <div>
                <label htmlFor="prof-name" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100">
                  Full name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="prof-nick" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100">
                  Nickname
                  <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    @
                  </span>
                  <input
                    id="prof-nick"
                    type="text"
                    autoComplete="username"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className={`${inputCls} pl-8`}
                    placeholder="yourhandle"
                    maxLength={30}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Letters, numbers, _ or – · starts with a letter
                </p>
              </div>

              {profileMsg && (
                <p className={msgCls(profileMsg.ok)}>
                  {profileMsg.ok && <CheckIcon />}
                  {profileMsg.text}
                </p>
              )}

              <Button
                type="submit"
                disabled={profileSaving}
                className="w-full"
              >
                {profileSaving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Card>

          {/* Change password card */}
          <Card>
            <CardTitle>Change password</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Choose a strong password of at least 8 characters.
            </p>
            <form className="mt-5 space-y-4" onSubmit={(e) => void handlePasswordSave(e)}>
              <div>
                <label htmlFor="cur-pwd" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100">
                  Current password
                </label>
                <input
                  id="cur-pwd"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="new-pwd" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100">
                  New password
                </label>
                <input
                  id="new-pwd"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="conf-pwd" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-100">
                  Confirm new password
                </label>
                <input
                  id="conf-pwd"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className={`${inputCls} ${
                    confirmPwd && newPwd !== confirmPwd
                      ? "border-rose-400 focus:ring-rose-300"
                      : ""
                  }`}
                  placeholder="••••••••"
                />
                {confirmPwd && newPwd !== confirmPwd && (
                  <p className="mt-1 text-xs text-rose-600">Passwords do not match.</p>
                )}
              </div>

              {pwdMsg && (
                <p className={msgCls(pwdMsg.ok)}>
                  {pwdMsg.ok && <CheckIcon />}
                  {pwdMsg.text}
                </p>
              )}

              <Button
                type="submit"
                disabled={pwdSaving || (!!confirmPwd && newPwd !== confirmPwd)}
                className="w-full"
              >
                {pwdSaving ? "Updating…" : "Update password"}
              </Button>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN ──────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Stats card */}
          <Card>
            <CardTitle>Your stats</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Lifetime performance across all completed quizzes.
            </p>

            {stats.totalSessions === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Complete your first quiz to see stats here.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  label="Total points"
                  value={stats.totalPoints.toLocaleString()}
                  sub="lifetime"
                  accent
                />
                <StatCard
                  label="Avg accuracy"
                  value={pct(stats.avgPercentage)}
                  sub="lifetime mean"
                />
                <StatCard
                  label="Best run"
                  value={pct(stats.bestPercentage)}
                  sub="single session"
                />
                <StatCard
                  label="Total quizzes"
                  value={stats.totalSessions}
                  sub="all time"
                />
                <StatCard
                  label="Last 7 days"
                  value={stats.sessionsLast7}
                  sub="sessions"
                />
                <StatCard
                  label="Last 30 days"
                  value={stats.sessionsLast30}
                  sub="sessions"
                />
                <StatCard
                  label="Longest streak"
                  value={stats.maxStreak > 0 ? `${stats.maxStreak} ✓` : "–"}
                  sub="correct in a row"
                />
                <StatCard
                  label="Avg pace"
                  value={pace ? `~${pace}` : "–"}
                  sub="per question"
                />
              </div>
            )}
          </Card>

          {/* Subscription card */}
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Subscription</CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  Manage your plan and billing.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Free
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-100">What&apos;s included on Free:</p>
              <ul className="ml-4 list-disc space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <li>3 quizzes per day</li>
                <li>Up to 10 questions per quiz</li>
                <li>7-day progress history</li>
                <li>All rank tiers</li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.05] p-4 dark:border-accent/40 dark:bg-accent/[0.08]">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Memora Pro
                <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                  Coming soon
                </span>
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <li>10 quizzes per day</li>
                <li>Up to 50 questions per quiz</li>
                <li>30-day progress history</li>
                <li>Deeper session analytics</li>
                <li>Priority AI generation</li>
              </ul>
              <Button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed opacity-60"
              >
                Upgrade: coming soon
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
