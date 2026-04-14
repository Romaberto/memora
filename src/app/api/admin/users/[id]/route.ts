/**
 * PATCH /api/admin/users/:id
 *
 * Update a user's role, subscription tier, or other admin-editable fields.
 * Admin-gated.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { TIER_IDS } from "@/lib/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    role: z.enum(["user", "admin"]).optional(),
    // Admins can assign any of the 4 tiers. `TIER_IDS` is the single source
    // of truth in lib/tiers.ts — if we ever add/remove a tier there, this
    // validator picks it up automatically.
    subscriptionTier: z.enum(TIER_IDS).optional(),
    name: z.string().min(1).max(100).trim().optional(),
    nickname: z.string().max(50).trim().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    return NextResponse.json({ error: issues }, { status: 400 });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const targetId = params.id;

  // Prevent demoting yourself
  if (targetId === userId && data.role && data.role !== "admin") {
    return NextResponse.json(
      { error: "You cannot remove your own admin role." },
      { status: 400 },
    );
  }

  // Check target user exists
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent editing guest user
  if (target.email === "guest@memorize.local") {
    return NextResponse.json({ error: "Cannot edit guest user" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
    select: {
      id: true,
      name: true,
      nickname: true,
      email: true,
      role: true,
      subscriptionTier: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
