import { z } from "zod";
import type { AIClient } from "@/lib/ai";

export type RelatedTopicSuggestion = {
  title: string;
  angle: string;
};

type GenerateRelatedTopicsInput = {
  title: string | null;
  topic: string;
  summaryText: string;
  notes: string | null;
  percentage: number;
  rankName: string;
  questions: {
    question: string;
    explanation: string;
  }[];
};

const relatedTopicSchema = z.object({
  title: z.string().min(3).max(90),
  angle: z.string().min(8).max(180),
});

const relatedTopicsPayloadSchema = z.object({
  topics: z.array(relatedTopicSchema),
});

const RELATED_TOPICS_JSON_SCHEMA = {
  name: "related_topics",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            angle: { type: "string" },
          },
          required: ["title", "angle"],
        },
      },
    },
    required: ["topics"],
  },
} as const;

export async function generateRelatedTopics(
  ai: AIClient | null,
  input: GenerateRelatedTopicsInput,
): Promise<{ topics: RelatedTopicSuggestion[]; usedFallback: boolean }> {
  const fallback = fallbackRelatedTopics(input);
  if (!ai) return { topics: fallback, usedFallback: true };

  try {
    const raw = await ai.completeJson({
      model: process.env.OPENAI_RELATED_TOPICS_MODEL ?? "gpt-4.1-nano",
      maxTokens: 520,
      timeoutMs: 6_000,
      jsonSchema: RELATED_TOPICS_JSON_SCHEMA,
      system:
        "You suggest concise next custom-quiz topics for a learning app. Stay tightly anchored to the completed quiz subject. Do not generate quiz questions.",
      user: buildRelatedTopicsPrompt(input),
    });
    const parsed = relatedTopicsPayloadSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { topics: fallback, usedFallback: true };

    const topics = normalizeTopics(parsed.data.topics, fallback);
    return {
      topics,
      usedFallback: topics.length < 5,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[related-topics] Falling back after model error:", err);
    }
    return { topics: fallback, usedFallback: true };
  }
}

function buildRelatedTopicsPrompt(input: GenerateRelatedTopicsInput): string {
  const sourceTitle = input.title?.trim() || input.topic;
  const scoreContext =
    input.percentage >= 80
      ? "The learner did well; suggest deeper or adjacent topics."
      : input.percentage >= 55
        ? "The learner is close; mix reinforcement with adjacent topics."
        : "The learner struggled; suggest foundational adjacent topics.";

  const questionContext = input.questions
    .slice(0, 5)
    .map((q, index) => {
      return `${index + 1}. ${truncate(q.question.trim(), 180)}`;
    })
    .join("\n");

  return [
    `Completed quiz: ${sourceTitle}`,
    `Stored topic: ${input.topic}`,
    `Result: ${Math.round(input.percentage)}%, ${input.rankName}`,
    scoreContext,
    input.summaryText.trim()
      ? `Source summary:\n${truncate(input.summaryText.trim(), 900)}`
      : "",
    input.notes?.trim() ? `User notes:\n${truncate(input.notes.trim(), 500)}` : "",
    questionContext ? `Quiz context:\n${questionContext}` : "",
    "",
    "Return exactly 5 topic suggestions.",
    "Rules:",
    "- Each title should be 3 to 8 words.",
    "- The first topic should be the strongest recommended next step.",
    "- Stay close to the completed quiz subject, not just the broad category.",
    "- If the quiz is about a named game, book, movie, person, product, event, or concept, keep that named subject or its recognizable world in every title.",
    "- For games, prefer lore, characters, factions, locations, endings, mechanics, builds, quests, or world details. Avoid generic words like strategies, themes, dilemmas, and influences unless the original quiz was about those.",
    "- Do not repeat the exact completed quiz title.",
    "- Do not mention subscriptions, pricing, or paid plans.",
    "- The angle should explain why this is a useful next quiz in one short sentence.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeTopics(
  topics: RelatedTopicSuggestion[],
  fallback: RelatedTopicSuggestion[],
): RelatedTopicSuggestion[] {
  const seen = new Set<string>();
  const out: RelatedTopicSuggestion[] = [];

  for (const item of [...topics, ...fallback]) {
    const title = cleanText(item.title, 90);
    const angle = cleanText(item.angle, 180);
    const key = title.toLowerCase();
    if (!title || !angle || seen.has(key)) continue;
    seen.add(key);
    out.push({ title, angle });
    if (out.length === 5) break;
  }

  return out;
}

function fallbackRelatedTopics(
  input: GenerateRelatedTopicsInput,
): RelatedTopicSuggestion[] {
  const base = cleanText(input.title || input.topic, 60) || "this topic";
  const isGameLike = /\b(game|gaming|cyberpunk|rpg|quest|quests|level|levels|character|characters)\b/i.test(base);
  const topics = isGameLike
    ? [
        {
          title: `${base} lore and world`,
          angle: "A closer look at the setting, factions, and details behind the game.",
        },
        {
          title: `${base} characters and roles`,
          angle: "Useful if you want to remember who matters and why.",
        },
        {
          title: `${base} mechanics and systems`,
          angle: "A practical next quiz about how the game actually works.",
        },
        {
          title: `${base} quests and choices`,
          angle: "A focused pass on story decisions and their consequences.",
        },
        {
          title: `${base} locations and factions`,
          angle: "Good for connecting places, groups, and worldbuilding details.",
        },
      ]
    : [
        {
          title: `Key details in ${base}`,
          angle: "A tighter follow-up that stays close to the same subject.",
        },
        {
          title: `${base} terms and definitions`,
          angle: "Useful for locking down the vocabulary before going deeper.",
        },
        {
          title: `${base} examples and cases`,
          angle: "A practical next quiz that makes the ideas easier to apply.",
        },
        {
          title: `${base} causes and effects`,
          angle: "Good for remembering how the main ideas connect.",
        },
        {
          title: `Hard questions about ${base}`,
          angle: "A deeper pass once the basics are already familiar.",
        },
      ];

  return topics.map((topic) => ({
    title: cleanText(topic.title, 90),
    angle: cleanText(topic.angle, 180),
  }));
}

function cleanText(value: string, maxLength: number): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}
