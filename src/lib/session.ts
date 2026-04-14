/**
 * JWT-based session using `jose` (works in Node.js AND Next.js Edge middleware).
 *
 * Cookie: HTTP-only, SameSite=Lax, 30-day expiry.
 * Algorithm: HS256 signed with SESSION_SECRET env var.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "memorize.session";
export const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET env var is required in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    // Dev-only fallback — never used in production.
    return new TextEncoder().encode(
      "dev-secret-please-set-SESSION_SECRET-in-env-min-32-chars!!",
    );
  }
  return new TextEncoder().encode(s);
}

/** Create a signed JWT containing the userId and optional claims. */
export async function createSessionToken(
  userId: string,
  opts?: { onboardingCompleted?: boolean },
): Promise<string> {
  return new SignJWT({ userId, onboardingCompleted: opts?.onboardingCompleted ?? false })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

/** Verify a JWT and return the userId, or null if invalid/expired. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export type SessionPayload = { userId: string; onboardingCompleted: boolean };

/** Verify a JWT and return the full session payload. */
export async function verifySessionFull(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      // Treat missing claim as true (backward compat for existing users)
      onboardingCompleted: payload.onboardingCompleted === false ? false : true,
    };
  } catch {
    return null;
  }
}

/** Cookie attributes to use when setting the session cookie. */
export function sessionCookieAttrs(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** Cookie attributes to use when clearing the session cookie. */
export function clearCookieAttrs() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
