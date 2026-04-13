import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { findByEmail } from "@/lib/csv-users";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, sessionCookieAttrs } from "@/lib/session";
import { getClientIp, ratelimitAuth } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  // Rate limit by IP
  const ip = getClientIp(req);
  const rl = await ratelimitAuth(`ip:login:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 5) } },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // findByEmail now queries Prisma directly — no separate CSV file
  const user = await findByEmail(email);
  // Use the same generic message for both "not found" and "wrong password"
  // to avoid leaking which emails are registered.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(user.id);
  cookies().set(sessionCookieAttrs(token));

  return NextResponse.json({ ok: true, name: user.name });
}
