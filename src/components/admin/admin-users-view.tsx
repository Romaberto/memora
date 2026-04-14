"use client";

/**
 * Admin user management table with search, filter, sort, pagination,
 * and an edit drawer for role / subscription tier / name / nickname.
 */
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { LEAGUES } from "@/lib/leagues";
import { TIERS_IN_ORDER, TIER_IDS, type TierId } from "@/lib/tiers";

type TierFilter = "" | TierId;

type AdminUser = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  role: string;
  subscriptionTier: string;
  country: string | null;
  createdAt: string;
  totalPoints: number;
  quizCount: number;
  avgAccuracy: number | null;
  league: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type SortField = "createdAt" | "email" | "name" | "subscriptionTier" | "totalPoints" | "quizCount";
type SortOrder = "asc" | "desc";

/** Convert ISO 3166-1 alpha-2 code to flag emoji */
function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "";
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Build league name → color classes map from the shared leagues module. */
const LEAGUE_COLORS: Record<string, string> = Object.fromEntries(
  LEAGUES.map((l) => [l.name, `${l.bg} ${l.color}`]),
);
LEAGUE_COLORS["Unranked"] = "bg-slate-50 text-slate-400";

const LEAGUE_ICONS: Record<string, string> = Object.fromEntries(
  LEAGUES.map((l) => [l.name, l.icon]),
);

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700",
  user: "bg-slate-100 text-slate-500",
};

// ─── Edit Modal ─────────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [tier, setTier] = useState(user.subscriptionTier);
  const [name, setName] = useState(user.name ?? "");
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges =
    role !== user.role ||
    tier !== user.subscriptionTier ||
    name !== (user.name ?? "") ||
    nickname !== (user.nickname ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (role !== user.role) body.role = role;
      if (tier !== user.subscriptionTier) body.subscriptionTier = tier;
      if (name !== (user.name ?? "")) body.name = name;
      if (nickname !== (user.nickname ?? "")) body.nickname = nickname;

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          {user.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.image} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
              {(user.name || user.email || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              {user.name || user.nickname || "Unknown"}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* Stats (read-only) */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {user.totalPoints.toLocaleString()}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Points</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {user.quizCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Quizzes</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {user.avgAccuracy != null ? `${user.avgAccuracy}%` : "—"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Accuracy</p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          {/* Role */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role
            </label>
            <div className="flex gap-2">
              {["user", "admin"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    role === r
                      ? r === "admin"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-accent bg-accent/10 text-accent"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Subscription Tier — 4 options sourced from lib/tiers.ts */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Subscription Tier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIERS_IN_ORDER.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    tier === t.id
                      ? t.id === "free"
                        ? "border-slate-300 bg-slate-50 text-slate-700"
                        : "border-accent bg-accent/10 text-accent"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700"
                  }`}
                >
                  <span className="block">{t.name}</span>
                  <span className="mt-0.5 block text-[10px] font-normal uppercase tracking-wider text-slate-400">
                    {t.id}
                    {t.priceMonthly > 0 ? ` · $${t.priceMonthly}/mo` : " · free"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Info badges (read-only) */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${LEAGUE_COLORS[user.league] ?? LEAGUE_COLORS.Unranked}`}>
              <span>{LEAGUE_ICONS[user.league] ?? ""}</span>
              {user.league}
            </span>
            {user.country && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {countryFlag(user.country)} {user.country}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Saved successfully
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasChanges || saving}
            onClick={() => void handleSave()}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Table ─────────────────────────────────────────────────────────────

export function AdminUsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("");
  const [sort, setSort] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "25",
          sort,
          order,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (tierFilter) params.set("tier", tierFilter);

        const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const json = await res.json();
        setUsers(json.users);
        setPagination(json.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "fetch failed");
      } finally {
        setLoading(false);
      }
    },
    [sort, order, debouncedSearch, tierFilter],
  );

  useEffect(() => {
    void fetchUsers(1);
  }, [fetchUsers]);

  function handleSort(field: SortField) {
    if (sort === field) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1 text-accent">{order === "desc" ? "↓" : "↑"}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Edit modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => void fetchUsers(pagination.page)}
        />
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by email, name, or nickname…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || (TIER_IDS as readonly string[]).includes(v)) {
              setTierFilter(v as TierFilter);
            }
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All tiers</option>
          {TIERS_IN_ORDER.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          {pagination.totalCount.toLocaleString()} user{pagination.totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                <th className="sticky left-0 z-10 bg-slate-50/95 px-4 py-3 backdrop-blur-sm dark:bg-slate-900/95">User</th>
                <th
                  className="cursor-pointer px-4 py-3 select-none hover:text-slate-700"
                  onClick={() => handleSort("email")}
                >
                  Email
                  <SortIcon field="email" />
                </th>
                <th className="px-4 py-3">Role</th>
                <th
                  className="cursor-pointer px-4 py-3 select-none hover:text-slate-700"
                  onClick={() => handleSort("subscriptionTier")}
                >
                  Tier
                  <SortIcon field="subscriptionTier" />
                </th>
                <th className="px-4 py-3">Country</th>
                <th
                  className="cursor-pointer px-4 py-3 text-right select-none hover:text-slate-700"
                  onClick={() => handleSort("totalPoints")}
                >
                  Points
                  <SortIcon field="totalPoints" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right select-none hover:text-slate-700"
                  onClick={() => handleSort("quizCount")}
                >
                  Quizzes
                  <SortIcon field="quizCount" />
                </th>
                <th className="px-4 py-3 text-right">Avg %</th>
                <th className="px-4 py-3">League</th>
                <th
                  className="cursor-pointer px-4 py-3 select-none hover:text-slate-700"
                  onClick={() => handleSort("createdAt")}
                >
                  Joined
                  <SortIcon field="createdAt" />
                </th>
                <th className="sticky right-0 bg-slate-50/95 px-4 py-3 text-center backdrop-blur-sm dark:bg-slate-900/95">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                  >
                    {/* User avatar + name */}
                    <td className="sticky left-0 z-10 bg-white/95 px-4 py-3 backdrop-blur-sm dark:bg-slate-900/95">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={u.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                            {(u.name || u.email || "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white">
                            {u.name || u.nickname || "—"}
                          </p>
                          {u.nickname && u.name && (
                            <p className="truncate text-xs text-slate-400">@{u.nickname}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="truncate block max-w-[200px]">{u.email || "—"}</span>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ROLE_BADGE[u.role] ?? ROLE_BADGE.user
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    {/* Tier badge — accent for any paid tier, neutral for free */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.subscriptionTier === "free"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {u.subscriptionTier}
                      </span>
                    </td>
                    {/* Country */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {u.country ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span>{countryFlag(u.country)}</span>
                          <span>{u.country}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    {/* Points */}
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                      {u.totalPoints.toLocaleString()}
                    </td>
                    {/* Quiz count */}
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {u.quizCount}
                    </td>
                    {/* Avg accuracy */}
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {u.avgAccuracy != null ? `${u.avgAccuracy}%` : "—"}
                    </td>
                    {/* League */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          LEAGUE_COLORS[u.league] ?? LEAGUE_COLORS.Unranked
                        }`}
                      >
                        <span>{LEAGUE_ICONS[u.league] ?? ""}</span>
                        {u.league}
                      </span>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    {/* Edit button */}
                    <td className="sticky right-0 bg-white/95 px-4 py-3 text-center backdrop-blur-sm dark:bg-slate-900/95">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void fetchUsers(pagination.page - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void fetchUsers(pagination.page + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
