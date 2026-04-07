import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { findByEmail, createCsvUser } from "@/lib/csv-users";
import { hashPassword } from "@/lib/password";
import { createSessionToken, sessionCookieAttrs } from "@/lib/session";

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

  // Check uniqueness in DB
  if (await findByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  // Hash password and persist — createCsvUser now writes directly to Prisma
  const passwordHash = hashPassword(password);
  const user = await createCsvUser(email, passwordHash, name);

  // Issue session cookie
  const token = await createSessionToken(user.id);
  cookies().set(sessionCookieAttrs(token));

  return NextResponse.json({ ok: true, name: user.name }, { status: 201 });
}
