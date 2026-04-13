"use client";

/**
 * Admin panel with tabbed navigation: General (live ops) and Users.
 */
import { useState } from "react";
import { AdminHealthView } from "./admin-health-view";
import { AdminUsersView } from "./admin-users-view";

const TABS = [
  { id: "general", label: "General" },
  { id: "users", label: "Users" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "general" && <AdminHealthView />}
      {tab === "users" && <AdminUsersView />}
    </div>
  );
}
