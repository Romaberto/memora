import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { findByEmail, createCsvUser } from "@/lib/csv-users";
import { hashPassword } from "@/lib/password";
import { createSessionToken, sessionCookieAttrs } from "@/lib/session";
import prisma from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
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
    const issues = parsed.error.errors.map((e) => e.message).join(". ");
    return NextResponse.json({ error: issues }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  // Check uniqueness in CSV
  if (findByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  // Hash password and persist to CSV
  const passwordHash = hashPassword(password);
  const csvUser = createCsvUser(email, passwordHash, name);

  // Also create a matching Prisma User record (needed for quiz FK relations)
  await prisma.user.upsert({
    where: { email },
    create: { id: csvUser.id, email, name },
    update: { name },
  });

  // Issue session cookie
  const token = await createSessionToken(csvUser.id);
  cookies().set(sessionCookieAttrs(token));

  return NextResponse.json({ ok: true, name: csvUser.name }, { status: 201 });
}
