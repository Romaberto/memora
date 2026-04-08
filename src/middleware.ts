/**
 * Edge middleware: protects /dashboard, /profile, /leaderboard.
 * Redirects to /login if no valid session token.
 */
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
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
  matcher: ["/dashboard/:path*", "/profile", "/leaderboard"],
};
