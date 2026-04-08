/**
 * Server-side auth helpers for Route Handlers and Server Components.
 * Uses next/headers cookies — NOT usable in Edge middleware (use session.ts directly there).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import prisma from "./db";

/**
 * Returns the authenticated userId, or null if there is no valid session.
 * Also checks that the user actually exists in the DB — if the JWT is valid
 * but the user was deleted or the DB changed, clears the stale cookie.
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  // Verify user actually exists in the database
  const exists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!exists) {
    // Stale session — user doesn't exist in DB
    return null;
  }

  return userId;
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
