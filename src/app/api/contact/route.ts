/**
 * POST /api/contact
 *
 * Saves a contact-form submission to the ContactRequest table.
 * No auth required — this is a public form. Rate-limited by IP to
 * prevent spam (when Upstash is configured).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getClientIp, ratelimitContact } from "@/lib/rate-limit";

export const runtime = "nodejs";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").max(320),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await ratelimitContact(`ip:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 5) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await prisma.contactRequest.create({
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        message: parsed.data.message.trim(),
      },
    });
  } catch (err) {
    console.error("[contact] Failed to save:", err);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
