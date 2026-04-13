/**
 * Edge middleware:
 *   1. CSRF protection — reject non-GET requests with mismatched Origin header.
 *   2. Auth gating — protects /dashboard, /profile, /leaderboard, /admin.
 */
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PROTECTED_PATHS = ["/dashboard", "/profile", "/leaderboard", "/admin"];

export async function middleware(req: NextRequest) {
  // ── CSRF: verify Origin header on state-mutating requests ──────────
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const origin = req.headers.get("origin");
    if (origin) {
      const allowed = new URL(req.url).origin;
      if (origin !== allowed) {
        return NextResponse.json(
          { error: "Cross-origin request blocked" },
          { status: 403 },
        );
      }
    }
  }

  // ── Auth gate: only for protected paths ────────────────────────────
  const isProtected = PROTECTED_PATHS.some((p) =>
    req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + "/"),
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    // Invalid/expired JWT — clear the cookie and redirect
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected pages
    "/dashboard/:path*",
    "/profile",
    "/leaderboard",
    "/admin/:path*",
    // API routes (for CSRF check)
    "/api/:path*",
  ],
};
