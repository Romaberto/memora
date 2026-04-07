import { existsSync, unlinkSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { findById, updateUser } from "@/lib/csv-users";
import prisma from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const AVATARS_DIR = join(process.cwd(), "public", "avatars");

function ensureDir() {
  if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true });
}

/** Remove any existing avatar file for this user (any extension). */
function removeOldAvatar(userId: string) {
  for (const ext of Object.values(ALLOWED)) {
    const p = join(AVATARS_DIR, `${userId}.${ext}`);
    if (existsSync(p)) { try { unlinkSync(p); } catch { /* ignore */ } }
  }
}

// ── POST — upload new avatar ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No avatar file provided." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 2 MB." }, { status: 413 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG and WebP images are supported." },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  ensureDir();
  removeOldAvatar(userId);

  const filename = `${userId}.${ext}`;
  writeFileSync(join(AVATARS_DIR, filename), buffer);

  const avatarUrl = `/avatars/${filename}`;
  updateUser(userId, { avatarUrl });

  // Keep Prisma user.image in sync
  await prisma.user.update({ where: { id: userId }, data: { image: avatarUrl } })
    .catch(() => null);

  return NextResponse.json({ ok: true, avatarUrl });
}

// ── DELETE — remove avatar ────────────────────────────────────────────────────

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  removeOldAvatar(userId);
  updateUser(userId, { avatarUrl: "" });
  await prisma.user.update({ where: { id: userId }, data: { image: null } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
