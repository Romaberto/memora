import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  source: z.string().max(64).optional(),
});

/**
 * POST /api/waitlist
 *
 * Captures an email into the waitlist table. Works for both logged-in and
 * logged-out visitors. Idempotent: upsert by unique email, refreshing the
 * userId/source on collision so we don't silently drop the latest signal.
 *
 * Intentionally minimal — no rate limiting yet; add when we see abuse.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email, source } = parsed.data;

  // Optionally associate with the current user (cookies might be unreadable
  // in rare edge cases; we tolerate that by falling back to anonymous).
  let userId: string | null = null;
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (token) userId = (await verifySessionToken(token)) ?? null;
  } catch {
    userId = null;
  }

  await prisma.waitlistSignup.upsert({
    where: { email },
    update: {
      userId: userId ?? undefined,
      source: source ?? undefined,
    },
    create: {
      email,
      userId,
      source: source ?? "custom_quiz_gate",
    },
  });

  return NextResponse.json({ ok: true });
}
