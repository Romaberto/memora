import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

/**
 * Hash a plaintext password. Returns a `salt:hash` string safe to store in CSV.
 * Uses Node.js `scryptSync` (memory-hard, no extra deps).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored `salt:hash` string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const colonIdx = stored.indexOf(":");
    if (colonIdx === -1) return false;
    const salt = stored.slice(0, colonIdx);
    const hash = stored.slice(colonIdx + 1);
    const storedBuf = Buffer.from(hash, "hex");
    if (storedBuf.length !== KEYLEN) return false;
    const suppliedBuf = scryptSync(password, salt, KEYLEN);
    return timingSafeEqual(storedBuf, suppliedBuf);
  } catch {
    return false;
  }
}
