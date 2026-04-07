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
  const s =
    process.env.SESSION_SECRET ??
    "dev-secret-please-set-SESSION_SECRET-in-env-min-32-chars!!";
  return new TextEncoder().encode(s);
}

/** Create a signed JWT containing the userId. */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
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
