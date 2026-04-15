import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireUserId } from "@/lib/auth";

const MIN_TOPICS = 3;

const schema = z.object({
  topicIds: z.array(z.string().min(1)).min(MIN_TOPICS, "Select at least 3 topics"),
});

export async function PATCH(req: Request) {
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

  const topicIds = Array.from(new Set(parsed.data.topicIds));
  if (topicIds.length < MIN_TOPICS) {
    return NextResponse.json({ error: "Select at least 3 topics" }, { status: 400 });
  }

  const topicCount = await prisma.topic.count({ where: { id: { in: topicIds } } });
  if (topicCount !== topicIds.length) {
    return NextResponse.json({ error: "One or more invalid topic IDs" }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true, count: topicIds.length });
}
