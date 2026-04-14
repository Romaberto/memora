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

export type RecommendedQuiz = {
  id: string;              // PremadeQuiz.id (for routing)
  title: string;
  questionCount: number;
  quizNumber: number;
  topic: {
    slug: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
};

/**
 * Recommend pre-made quizzes for a user based on their topic interests.
 * Picks quizzes from interested topics that the user hasn't completed yet,
 * interleaved across topics for variety.
 */
export async function getRecommendedQuizzes(
  userId: string,
  limit = 6,
): Promise<RecommendedQuiz[]> {
  const interests = await prisma.userTopicInterest.findMany({
    where: { userId },
    select: { topicId: true },
  });
  if (interests.length === 0) return [];

  const topicIds = interests.map((i) => i.topicId);

  // All premade quizzes in user's interested topics
  const premade = await prisma.premadeQuiz.findMany({
    where: { topicId: { in: topicIds } },
    include: {
      topic: { select: { slug: true, name: true, icon: true, color: true } },
      quizRequest: { select: { questionCount: true } },
    },
    orderBy: { quizNumber: "asc" },
  });

  // Exclude quizzes the user has already played
  const played = await prisma.quizSession.findMany({
    where: {
      userId,
      quizRequestId: { in: premade.map((p) => p.quizRequestId) },
    },
    select: { quizRequestId: true },
  });
  const playedSet = new Set(played.map((s) => s.quizRequestId));
  const available = premade.filter((p) => !playedSet.has(p.quizRequestId));

  // Interleave by topic for variety: round-robin one quiz per topic at a time
  const byTopic = new Map<string, typeof available>();
  for (const q of available) {
    if (!byTopic.has(q.topicId)) byTopic.set(q.topicId, []);
    byTopic.get(q.topicId)!.push(q);
  }
  const lists = Array.from(byTopic.values());
  const interleaved: typeof available = [];
  let added = true;
  while (interleaved.length < limit && added) {
    added = false;
    for (const list of lists) {
      const next = list.shift();
      if (next) {
        interleaved.push(next);
        added = true;
        if (interleaved.length >= limit) break;
      }
    }
  }

  return interleaved.map((q) => ({
    id: q.id,
    title: q.title,
    questionCount: q.quizRequest.questionCount,
    quizNumber: q.quizNumber,
    topic: q.topic,
  }));
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
