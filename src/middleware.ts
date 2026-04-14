/**
 * Edge middleware:
 *   1. CSRF protection — reject non-GET requests with mismatched Origin header.
 *   2. Auth gating — protects /dashboard, /profile, /leaderboard, /admin, /onboarding.
 *   3. Onboarding redirect — new users who haven't completed onboarding get sent to /onboarding.
 */
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionFull } from "@/lib/session";

const PROTECTED_PATHS = ["/dashboard", "/profile", "/leaderboard", "/admin", "/onboarding"];

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

  // ── Auth gate: only for protected page paths (not /api) ────────────
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) =>
    pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifySessionFull(token);
  if (!session) {
    // Invalid/expired JWT — clear the cookie and redirect
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // ── Onboarding redirect ────────────────────────────────────────────
  const isOnboardingPage = pathname === "/onboarding";

  if (!session.onboardingCompleted && !isOnboardingPage) {
    // User hasn't completed onboarding — send them there
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (session.onboardingCompleted && isOnboardingPage) {
    // Already onboarded — skip onboarding page
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
    "/onboarding",
    // API routes (for CSRF check)
    "/api/:path*",
  ],
};
