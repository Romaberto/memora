import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { updateUser } from "@/lib/csv-users";

const schema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  nickname: z
    .string()
    .max(30)
    .trim()
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      "Nickname must start with a letter and contain only letters, numbers, _ or -",
    )
    .optional()
    .or(z.literal("")),
});

export async function PATCH(req: Request) {
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

  const { name, nickname } = parsed.data;
  if (!name && nickname === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updates: { name?: string; nickname?: string } = {};
  if (name) updates.name = name;
  if (nickname !== undefined) updates.nickname = nickname;

  // updateUser now writes directly to Prisma — no separate sync needed
  const updated = await updateUser(userId, updates);
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ ok: true, name: updated.name, nickname: updated.nickname });
}
