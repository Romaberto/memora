import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const KEYLEN = 64;
const scryptAsync = promisify(scrypt);

/**
 * Hash a plaintext password. Returns a `salt:hash` string.
 * Uses async scrypt to avoid blocking the event loop.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored `salt:hash` string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const colonIdx = stored.indexOf(":");
    if (colonIdx === -1) return false;
    const salt = stored.slice(0, colonIdx);
    const hash = stored.slice(colonIdx + 1);
    const storedBuf = Buffer.from(hash, "hex");
    if (storedBuf.length !== KEYLEN) return false;
    const suppliedBuf = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
    return timingSafeEqual(storedBuf, suppliedBuf);
  } catch {
    return false;
  }
}
