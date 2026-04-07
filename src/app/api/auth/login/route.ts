import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { findByEmail } from "@/lib/csv-users";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, sessionCookieAttrs } from "@/lib/session";
import prisma from "@/lib/db";

const schema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
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

  const csvUser = findByEmail(email);
  // Use the same generic message for both "not found" and "wrong password"
  // to avoid leaking which emails are registered.
  if (!csvUser || !verifyPassword(password, csvUser.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // Ensure the Prisma User record exists (guard against manual CSV edits)
  await prisma.user.upsert({
    where: { email },
    create: { id: csvUser.id, email, name: csvUser.name },
    update: { name: csvUser.name },
  });

  const token = await createSessionToken(csvUser.id);
  cookies().set(sessionCookieAttrs(token));

  return NextResponse.json({ ok: true, name: csvUser.name });
}
