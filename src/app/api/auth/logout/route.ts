import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearCookieAttrs } from "@/lib/session";

export async function POST() {
  cookies().set(clearCookieAttrs());
  return NextResponse.json({ ok: true });
}
