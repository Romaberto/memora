/**
 * Edge middleware:
 * - Protects /dashboard, /profile, /leaderboard → redirects to /login if not authed.
 * - Redirects /login, /register → /dashboard if already authed (no double sign-in).
 */
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;
  const path = req.nextUrl.pathname;

  // Auth pages: redirect logged-in users to dashboard
  if (path === "/login" || path === "/register") {
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected pages: redirect anonymous users to login
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile", "/leaderboard", "/login", "/register"],
};
