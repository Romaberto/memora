import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { createSessionToken, sessionCookieAttrs } from "@/lib/session";

const schema = z.object({
  topicIds: z.array(z.string().min(1)).min(3, "Select at least 3 topics"),
});

export async function POST(req: Request) {
  const userId = await requireUserId();

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

  const { topicIds } = parsed.data;

  // Verify all topic IDs exist
  const topicCount = await prisma.topic.count({ where: { id: { in: topicIds } } });
  if (topicCount !== topicIds.length) {
    return NextResponse.json({ error: "One or more invalid topic IDs" }, { status: 400 });
  }

  // Persist interests and mark onboarding complete in a single transaction
  await prisma.$transaction([
    prisma.userTopicInterest.deleteMany({ where: { userId } }),
    ...topicIds.map((topicId) =>
      prisma.userTopicInterest.create({ data: { userId, topicId } }),
    ),
    prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    }),
  ]);

  // Re-mint session token with onboardingCompleted = true
  const token = await createSessionToken(userId, { onboardingCompleted: true });
  cookies().set(sessionCookieAttrs(token));

  return NextResponse.json({ ok: true });
}
