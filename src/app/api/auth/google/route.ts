/**
 * Google OAuth — start the Authorization Code + PKCE flow.
 *
 *   GET /api/auth/google
 *
 * 1. Generate a fresh `state` and PKCE verifier/challenge pair.
 * 2. Store them in short-lived HttpOnly cookies (round-tripped to the callback).
 * 3. 302 redirect the user to Google's consent screen.
 *
 * The callback at `/api/auth/google/callback` reads the cookies, verifies state,
 * exchanges the code, and mints the session.
 */
import { NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  generatePkcePair,
  generateState,
  getGoogleOAuthEnv,
  OAUTH_COOKIE_MAX_AGE,
  OAUTH_PKCE_COOKIE,
  OAUTH_STATE_COOKIE,
} from "@/lib/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getGoogleOAuthEnv();
  if (!env) {
    // Misconfigured — bounce back to login with an error code instead of crashing.
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }

  const state = generateState();
  const { verifier, challenge } = generatePkcePair();

  const url = buildAuthorizationUrl({ env, state, codeChallenge: challenge });

  const res = NextResponse.redirect(url);
  const isProd = process.env.NODE_ENV === "production";

  // SameSite must be "lax" so the cookie survives the cross-site redirect from
  // accounts.google.com back to our callback. "strict" would drop it.
  res.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  res.cookies.set({
    name: OAUTH_PKCE_COOKIE,
    value: verifier,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });

  return res;
}
