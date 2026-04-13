/**
 * csv-users.ts — User store (formerly CSV-backed, now Prisma/PostgreSQL).
 *
 * All exported types and function signatures are identical to the old CSV
 * version so that the 8 importing files need minimal edits (just add await).
 *
 * Field mapping  CsvUser ↔ Prisma User
 *   avatarUrl  ↔  image
 *   nickname   ↔  nickname   (added to schema)
 *   passwordHash ↔ passwordHash (added to schema)
 *   createdAt  ↔  createdAt.toISOString()
 */

import prisma from "./db";

// ---------------------------------------------------------------------------
// Types (kept identical so importers need only add "await")
// ---------------------------------------------------------------------------

export type CsvUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  nickname: string;   // short display handle, e.g. "roman"
  avatarUrl: string;  // relative path like "/avatars/abc.jpg" or ""
  createdAt: string;
};

export type CsvUserUpdate = Partial<
  Pick<CsvUser, "name" | "nickname" | "avatarUrl" | "passwordHash">
>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  name: true,
  nickname: true,
  image: true,
  createdAt: true,
} as const;

type Row = {
  id: string;
  email: string | null;
  passwordHash: string | null;
  name: string | null;
  nickname: string | null;
  image: string | null;
  createdAt: Date;
};

function toUser(row: Row): CsvUser {
  return {
    id: row.id,
    email: row.email ?? "",
    passwordHash: row.passwordHash ?? "",
    name: row.name ?? "",
    nickname: row.nickname ?? "",
    avatarUrl: row.image ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API  (same signatures as before, now async)
// ---------------------------------------------------------------------------

export async function findByEmail(email: string): Promise<CsvUser | null> {
  const row = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: SELECT,
  });
  return row ? toUser(row) : null;
}

export async function findById(id: string): Promise<CsvUser | null> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: SELECT,
  });
  return row ? toUser(row) : null;
}

export async function createCsvUser(
  email: string,
  passwordHash: string,
  name: string,
  /** ISO 3166-1 alpha-2 country code from Vercel x-vercel-ip-country header */
  country?: string | null,
): Promise<CsvUser> {
  const row = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      nickname: "",
      image: "",
      ...(country ? { country: country.toUpperCase() } : {}),
    },
    select: SELECT,
  });
  return toUser(row);
}

/** Partially update a user. Returns the updated row or null if not found. */
export async function updateUser(
  id: string,
  updates: CsvUserUpdate,
): Promise<CsvUser | null> {
  // Map avatarUrl → image for Prisma
  const { avatarUrl, ...rest } = updates;
  const data: Record<string, string | undefined | null> = { ...rest };
  if (avatarUrl !== undefined) data.image = avatarUrl || null;

  try {
    const row = await prisma.user.update({
      where: { id },
      data,
      select: SELECT,
    });
    return toUser(row);
  } catch {
    // P2025 = record not found
    return null;
  }
}
