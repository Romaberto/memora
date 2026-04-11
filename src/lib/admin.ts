/**
 * Admin gating for the live ops dashboard.
 *
 * The set of admin users is controlled entirely via the `ADMIN_EMAILS` env var
 * (comma-separated). No DB column, no UI to grant — intentional, so it can't
 * be flipped on by a runtime bug. Add yourself by setting:
 *
 *   ADMIN_EMAILS="you@example.com,colleague@example.com"
 *
 * If `ADMIN_EMAILS` is empty, NOBODY is admin (the dashboard is dark).
 */
import { redirect } from "next/navigation";
import prisma from "./db";
import { getSessionUserId } from "./auth";

function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True if the given userId belongs to an admin per ADMIN_EMAILS. */
export async function isAdmin(userId: string): Promise<boolean> {
  const admins = adminEmailSet();
  if (admins.size === 0) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return false;
  return admins.has(user.email.toLowerCase());
}

/**
 * For Server Components — redirects non-admins to /dashboard.
 * Returns the userId if the request is allowed.
 */
export async function requireAdminUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const ok = await isAdmin(userId);
  if (!ok) redirect("/dashboard");
  return userId;
}
