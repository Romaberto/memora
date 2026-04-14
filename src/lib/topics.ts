/**
 * Data access layer for pre-made topics and quizzes.
 */
import prisma from "./db";

export type TopicWithCount = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  quizCount: number;
};

export async function getTopics(): Promise<TopicWithCount[]> {
  const topics = await prisma.topic.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { premadeQuizzes: true } } },
  });
  return topics.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    sortOrder: t.sortOrder,
    quizCount: t._count.premadeQuizzes,
  }));
}

export async function getTopicBySlug(slug: string) {
  return prisma.topic.findUnique({
    where: { slug },
    include: {
      premadeQuizzes: {
        orderBy: { quizNumber: "asc" },
        include: {
          quizRequest: {
            select: { id: true, questionCount: true },
          },
        },
      },
    },
  });
}

/**
 * Get the user's best session for each premade quiz in a topic.
 * Returns a map of quizRequestId → best session.
 */
export async function getUserTopicProgress(userId: string, topicSlug: string) {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
    include: {
      premadeQuizzes: { select: { quizRequestId: true } },
    },
  });
  if (!topic) return new Map<string, { score: number; percentage: number; rankName: string }>();

  const qrIds = topic.premadeQuizzes.map((pq) => pq.quizRequestId);
  if (qrIds.length === 0) return new Map<string, { score: number; percentage: number; rankName: string }>();

  const sessions = await prisma.quizSession.findMany({
    where: { userId, quizRequestId: { in: qrIds } },
    orderBy: { percentage: "desc" },
    select: { quizRequestId: true, score: true, percentage: true, rankName: true },
  });

  // Keep only the best session per quizRequest
  const best = new Map<string, { score: number; percentage: number; rankName: string }>();
  for (const s of sessions) {
    if (!best.has(s.quizRequestId)) {
      best.set(s.quizRequestId, { score: s.score, percentage: s.percentage, rankName: s.rankName });
    }
  }
  return best;
}

/** Get the slugs of topics the user selected during onboarding. */
export async function getUserInterestedTopicSlugs(userId: string): Promise<string[]> {
  const interests = await prisma.userTopicInterest.findMany({
    where: { userId },
    select: { topic: { select: { slug: true } } },
  });
  return interests.map((i) => i.topic.slug);
}

export async function getPremadeQuizById(premadeQuizId: string) {
  return prisma.premadeQuiz.findUnique({
    where: { id: premadeQuizId },
    include: {
      topic: true,
      quizRequest: {
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}
