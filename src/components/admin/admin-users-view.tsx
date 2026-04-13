"use client";

/**
 * Admin user management table with search, filter, sort, and pagination.
 * Fetches from /api/admin/users.
 */
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type AdminUser = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
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

/** Convert ISO 3166-1 alpha-2 code to flag emoji (e.g. "US" → 🇺🇸) */
function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "";
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

const LEAGUE_COLORS: Record<string, string> = {
  Diamond: "bg-violet-100 text-violet-700",
  Platinum: "bg-sky-100 text-sky-700",
  Gold: "bg-amber-100 text-amber-700",
  Silver: "bg-slate-100 text-slate-600",
  Bronze: "bg-orange-100 text-orange-700",
  Starter: "bg-emerald-100 text-emerald-700",
  Unranked: "bg-slate-50 text-slate-400",
};

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
  const [tierFilter, setTierFilter] = useState<"" | "free" | "pro">("");
  const [sort, setSort] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          onChange={(e) => setTierFilter(e.target.value as "" | "free" | "pro")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
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
                <th className="px-4 py-3">User</th>
                <th
                  className="cursor-pointer px-4 py-3 select-none hover:text-slate-700"
                  onClick={() => handleSort("email")}
                >
                  Email
                  <SortIcon field="email" />
                </th>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
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
                    <td className="px-4 py-3">
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
                    {/* Tier badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.subscriptionTier === "pro"
                            ? "bg-accent/10 text-accent"
                            : "bg-slate-100 text-slate-500"
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
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          LEAGUE_COLORS[u.league] ?? LEAGUE_COLORS.Unranked
                        }`}
                      >
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
