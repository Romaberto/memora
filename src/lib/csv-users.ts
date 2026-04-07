import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const DATA_DIR = join(process.cwd(), "data");
const CSV_PATH = join(DATA_DIR, "users.csv");
// v2 header — nickname and avatarUrl added between name and createdAt
const HEADER = "id,email,passwordHash,name,nickname,avatarUrl,createdAt";

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
// CSV helpers
// ---------------------------------------------------------------------------

/** Parse a single CSV line, respecting RFC-4180 double-quoted fields. */
function parseLine(line: string): string[] {
  const result: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(field); field = "";
    } else {
      field += ch;
    }
  }
  result.push(field);
  return result;
}

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function toLine(u: CsvUser): string {
  return [
    u.id, u.email, u.passwordHash, u.name,
    u.nickname, u.avatarUrl, u.createdAt,
  ].map(escapeField).join(",");
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function ensureFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(CSV_PATH)) writeFileSync(CSV_PATH, HEADER + "\n", "utf-8");
}

function readAll(): CsvUser[] {
  ensureFile();
  const lines = readFileSync(CSV_PATH, "utf-8")
    .split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  return lines.slice(1).map((line) => {
    const p = parseLine(line);
    const id        = p[0] ?? "";
    const email     = p[1] ?? "";
    const pwdHash   = p[2] ?? "";
    const name      = p[3] ?? "";

    // Backward-compat: old rows have 5 fields (no nickname / avatarUrl)
    let nickname = "", avatarUrl = "", createdAt = "";
    if (p.length >= 7) {
      nickname  = p[4] ?? "";
      avatarUrl = p[5] ?? "";
      createdAt = p[6] ?? "";
    } else {
      createdAt = p[4] ?? "";
    }

    return { id, email, passwordHash: pwdHash, name, nickname, avatarUrl, createdAt };
  });
}

function writeAll(users: CsvUser[]): void {
  ensureFile();
  writeFileSync(
    CSV_PATH,
    [HEADER, ...users.map(toLine)].join("\n") + "\n",
    "utf-8",
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function findByEmail(email: string): CsvUser | null {
  return readAll().find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findById(id: string): CsvUser | null {
  return readAll().find((u) => u.id === id) ?? null;
}

export function createCsvUser(
  email: string,
  passwordHash: string,
  name: string,
): CsvUser {
  const user: CsvUser = {
    id: randomUUID(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    nickname: "",
    avatarUrl: "",
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), user]);
  return user;
}

/** Partially update a user row. Returns the updated row or null if not found. */
export function updateUser(id: string, updates: CsvUserUpdate): CsvUser | null {
  const users = readAll();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const updated = { ...users[idx]!, ...updates };
  users[idx] = updated;
  writeAll(users);
  return updated;
}
