import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { createAIClient } from "@/lib/ai";
import { generateRelatedTopics } from "@/lib/related-topics";
import { ratelimitRelatedTopics } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 15;

const CACHE_TTL_MS = 1000 * 60 * 30;
const MAX_MEMORY_CACHE_ENTRIES = 500;
const memoryCache = new Map<
  string,
  {
    expiresAt: number;
    body: {
      topics: Awaited<ReturnType<typeof generateRelatedTopics>>["topics"];
      usedFallback: boolean;
    };
  }
>();

type RouteParams = {
  params: {
    sessionId: string;
  };
};

export async function GET(_req: Request, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const cacheKey = `${userId}:${params.sessionId}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return relatedTopicsResponse(cached.body);
  }

  const rl = await ratelimitRelatedTopics(`user:${userId}`);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Try again in a moment.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds ?? 5),
        },
      },
    );
  }

  const session = await prisma.quizSession.findFirst({
    where: { id: params.sessionId, userId },
    select: {
      percentage: true,
      rankName: true,
      quizRequest: {
        select: {
          title: true,
          topic: true,
          summaryText: true,
          notes: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              question: true,
              explanation: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { topics, usedFallback } = await generateRelatedTopics(createAIClient(), {
    title: session.quizRequest.title,
    topic: session.quizRequest.topic,
    summaryText: session.quizRequest.summaryText,
    notes: session.quizRequest.notes,
    percentage: session.percentage,
    rankName: session.rankName,
    questions: session.quizRequest.questions,
  });

  const body = { topics, usedFallback };
  await persistRelatedTopicSuggestions({
    userId,
    sessionId: params.sessionId,
    topics,
  }).catch((err: unknown) => {
    console.error("[related-topics] Failed to persist suggestions:", err);
  });

  memoryCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    body,
  });
  pruneMemoryCache();

  return relatedTopicsResponse(body);
}

async function persistRelatedTopicSuggestions({
  userId,
  sessionId,
  topics,
}: {
  userId: string;
  sessionId: string;
  topics: Awaited<ReturnType<typeof generateRelatedTopics>>["topics"];
}) {
  if (topics.length === 0) return;

  await prisma.$transaction(
    topics.slice(0, 5).map((topic) =>
      prisma.relatedTopicSuggestion.upsert({
        where: {
          userId_sourceSessionId_title: {
            userId,
            sourceSessionId: sessionId,
            title: topic.title,
          },
        },
        create: {
          userId,
          sourceSessionId: sessionId,
          title: topic.title,
          angle: topic.angle,
        },
        update: {
          angle: topic.angle,
          dismissedAt: null,
        },
      }),
    ),
  );
}

function pruneMemoryCache() {
  const now = Date.now();
  for (const [key, value] of Array.from(memoryCache.entries())) {
    if (value.expiresAt <= now) memoryCache.delete(key);
  }

  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }
}

function relatedTopicsResponse(body: {
  topics: Awaited<ReturnType<typeof generateRelatedTopics>>["topics"];
  usedFallback: boolean;
}) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=1800",
    },
  });
}
