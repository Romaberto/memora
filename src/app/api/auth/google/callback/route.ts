/**
 * Google OAuth — finish the Authorization Code + PKCE flow.
 *
 *   GET /api/auth/google/callback?code=...&state=...
 *
 * 1. Verify the `state` query param matches our state cookie (CSRF defence).
 * 2. Exchange the code for an access token (proving PKCE possession).
 * 3. Fetch the user's profile from Google's userinfo endpoint.
 * 4. Find-or-create the User row:
 *    - First by `googleId` (stable Google `sub`)
 *    - Then by verified email (link the existing password-account)
 *    - Otherwise create a fresh row
 * 5. Mint our normal session JWT and 302 to /dashboard.
 *
 * Any failure path redirects to `/login?error=<code>` so the user gets a clear
 * message — never a 500 page.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createSessionToken, sessionCookieAttrs } from "@/lib/session";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  getGoogleOAuthEnv,
  OAUTH_PKCE_COOKIE,
  OAUTH_STATE_COOKIE,
} from "@/lib/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginErrorRedirect(req: Request, code: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", code);
  const res = NextResponse.redirect(url);
  // Always clear OAuth cookies on the way out — they're single-use.
  res.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
  res.cookies.set({ name: OAUTH_PKCE_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  const env = getGoogleOAuthEnv();
  if (!env) return loginErrorRedirect(req, "google_not_configured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // User declined consent on Google's side, or Google sent an error.
  if (errorParam) return loginErrorRedirect(req, "google_denied");
  if (!code || !state) return loginErrorRedirect(req, "google_missing_params");

  // Pull state + PKCE verifier out of the cookies set by the start route.
  // We use the request's cookie header directly because Next's `cookies()`
  // helper is read-only when used inside a route handler that also writes
  // response cookies.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieMap = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) cookieMap.set(k, rest.join("="));
  }
  const storedState = cookieMap.get(OAUTH_STATE_COOKIE);
  const codeVerifier = cookieMap.get(OAUTH_PKCE_COOKIE);

  if (!storedState || !codeVerifier) return loginErrorRedirect(req, "google_session_expired");
  if (storedState !== state) return loginErrorRedirect(req, "google_state_mismatch");

  // Exchange code → access token.
  let tokens;
  try {
    tokens = await exchangeCodeForTokens({ env, code, codeVerifier });
  } catch (err) {
    console.error("[google-callback] token exchange failed:", err);
    return loginErrorRedirect(req, "google_token_failed");
  }

  // Fetch user profile.
  let info;
  try {
    info = await fetchUserInfo(tokens.access_token);
  } catch (err) {
    console.error("[google-callback] userinfo failed:", err);
    return loginErrorRedirect(req, "google_userinfo_failed");
  }

  if (!info.email || !info.email_verified) {
    return loginErrorRedirect(req, "google_email_unverified");
  }

  const email = info.email.toLowerCase();
  const sub = info.sub;
  const name = info.name?.trim() || info.given_name?.trim() || null;
  const picture = info.picture?.trim() || null;
  // Capture country from Vercel's geo header (available on Vercel deployments)
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase() || null;

  // Find or create the user.
  let user = await prisma.user.findUnique({ where: { googleId: sub } });
  let isNewUser = false;

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      // Existing email/password account — link Google to it.
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: sub,
          // Don't clobber an existing avatar/name/country — only fill blanks.
          image: byEmail.image ?? picture,
          name: byEmail.name ?? name,
          emailVerified: byEmail.emailVerified ?? new Date(),
          country: byEmail.country ?? country,
        },
      });
    } else {
      // Brand new user.
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          name,
          nickname: name,
          image: picture,
          googleId: sub,
          emailVerified: new Date(),
          country,
        },
      });
    }
  }

  // Mint session and redirect based on onboarding status.
  const onboardingCompleted = user.onboardingCompleted;
  const token = await createSessionToken(user.id, { onboardingCompleted });
  const redirectUrl = new URL(onboardingCompleted ? "/dashboard" : "/onboarding", req.url);
  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(sessionCookieAttrs(token));
  // Clear single-use OAuth cookies.
  res.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
  res.cookies.set({ name: OAUTH_PKCE_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
