/**
 * Admin gating.
 *
 * A user is considered admin if EITHER:
 *   1. Their email is in the ADMIN_EMAILS env var (bootstrap / fallback), OR
 *   2. Their `role` column in the DB is "admin" (managed via admin panel).
 *
 * The env var acts as a bootstrap mechanism — once you can access the admin
 * panel, you can promote users from the UI and the env var becomes optional.
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

/** True if the given userId is an admin (env var OR DB role). */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });
  if (!user) return false;

  // DB role check
  if (user.role === "admin") return true;

  // Env var fallback
  const admins = adminEmailSet();
  if (admins.size > 0 && user.email && admins.has(user.email.toLowerCase())) {
    return true;
  }

  return false;
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
