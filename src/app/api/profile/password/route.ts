import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { findById, updateUser } from "@/lib/csv-users";
import { hashPassword, verifyPassword } from "@/lib/password";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(". ") },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await findById(userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Google-only accounts have no password set — reject gracefully
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Your account uses Google sign-in. Password change is not available." },
      { status: 400 },
    );
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from current password." },
      { status: 400 },
    );
  }

  await updateUser(userId, { passwordHash: await hashPassword(newPassword) });
  return NextResponse.json({ ok: true });
}
