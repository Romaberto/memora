/**
 * Server-side auth helpers for Route Handlers and Server Components.
 * Uses next/headers cookies — NOT usable in Edge middleware (use session.ts directly there).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * Returns the authenticated userId, or null if there is no valid session.
 * Use this in API Route Handlers to return 401 when null.
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Returns the authenticated userId, redirecting to /login if not authenticated.
 * Use this in Server Components / page.tsx files.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}
