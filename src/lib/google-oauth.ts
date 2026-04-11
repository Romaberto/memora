/**
 * Google OAuth 2.0 Authorization Code flow with PKCE.
 *
 * Used by `/api/auth/google` (start) and `/api/auth/google/callback` (finish).
 * We deliberately keep this dependency-free — no `googleapis`/`google-auth-library`
 * — just standard fetch + Node crypto.
 */
import { randomBytes, createHash } from "crypto";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

// Short-lived cookies that round-trip the OAuth dance.
export const OAUTH_STATE_COOKIE = "memorize.oauth_state";
export const OAUTH_PKCE_COOKIE = "memorize.oauth_pkce";
export const OAUTH_COOKIE_MAX_AGE = 60 * 5; // 5 minutes

export type GoogleOAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/** Reads + validates the Google OAuth env vars. Returns null if anything is missing. */
export function getGoogleOAuthEnv(): GoogleOAuthEnv | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/** 32 random bytes encoded as base64url — used for `state`. */
export function generateState(): string {
  return base64url(randomBytes(32));
}

/**
 * PKCE: random 64-byte verifier and its SHA-256 challenge.
 * The verifier stays in an HttpOnly cookie; the challenge goes to Google.
 */
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(64));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Builds the Google authorization URL the user is redirected to. */
export function buildAuthorizationUrl(opts: {
  env: GoogleOAuthEnv;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.env.clientId,
    redirect_uri: opts.env.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
};

/** Exchanges an authorization `code` for tokens. Throws on non-200. */
export async function exchangeCodeForTokens(opts: {
  env: GoogleOAuthEnv;
  code: string;
  codeVerifier: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.env.clientId,
    client_secret: opts.env.clientSecret,
    redirect_uri: opts.env.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.codeVerifier,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

/** Calls the OpenID userinfo endpoint with a bearer access token. */
export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google userinfo failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleUserInfo;
}
