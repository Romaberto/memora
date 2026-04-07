import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: { requestId: string } },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const requestId = params.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const deleted = await prisma.quizRequest.deleteMany({
    where: { id: requestId, userId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
