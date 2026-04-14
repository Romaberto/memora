/**
 * Idempotent seed script: generates pre-made quizzes for all topics via OpenAI.
 *
 * Usage:  npx tsx prisma/seed-premade.ts
 *
 * - Creates/upserts a system user (system@memora.local)
 * - Upserts all Topic rows from topics.ts
 * - For each topic × quizNumber (1-10): skips if PremadeQuiz already exists,
 *   otherwise calls OpenAI to generate 20 questions and persists them.
 * - Sequential with 1s delays between API calls to respect rate limits.
 */

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { TOPICS } from "./topics";

const prisma = new PrismaClient();

const SYSTEM_EMAIL = "system@memora.local";
const QUIZZES_PER_TOPIC = 10;
const QUESTIONS_PER_QUIZ = 20;

// Reuse the same system prompt from src/lib/quiz-generator.ts
const SYSTEM_PROMPT = `You are an expert learning designer who writes high-quality multiple-choice quizzes for retrieval practice.

OUTPUT RULES (STRICT):
- Respond with a single JSON object only. No markdown, no code fences, no commentary before or after JSON.
- The JSON must match this TypeScript shape:
  {
    "topic": string,
    "title": string,  // A SHORT subtitle (2–4 words) naming the SPECIFIC subtopics covered. Be precise — e.g. "Pricing & Elasticity", "Classical Conditioning", "Orbital Mechanics". NEVER use generic words like "Fundamentals", "Basics", "Concepts", "Overview".
    "questions": Array<{
      "id": string,
      "question": string,
      "options": string[],  // EXACTLY 4 distinct strings
      "correctIndex": number,  // 0, 1, 2, or 3 — index into options
      "explanation": string   // 1–3 short sentences, factual and concise
    }>
  }
- You MUST output EXACTLY N questions in "questions", where N is provided by the user message. Before you finish, count: questions.length MUST equal N (not N-1, not N+1).
- Each question MUST have EXACTLY 4 options.
- EXACTLY ONE option must be correct per question (unambiguous).
- Options must be mutually exclusive, parallel in style, and similar length (no giveaway phrasing).
- Questions should be fact-based, clear, and suitable for learning reinforcement — not trivia tricks, not impossibly hard.
- QUESTION STEMS (READ CAREFULLY): Each "question" string must be self-contained and unambiguous. Name the specific concept, claim, entity, or chapter-level idea being tested.
- Use neutral, precise wording. Avoid "all of the above" / "none of the above".
- Generate stable unique "id" values as random UUID strings for each question.
- Vary difficulty slightly across the set, but keep every item fair and clearly answerable.
- Order questions so difficulty tends to increase from the start of the array toward the end.`;

const QUIZ_JSON_SCHEMA = {
  name: "quiz_payload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["topic", "title", "questions"],
    properties: {
      topic: { type: "string" },
      title: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "question", "options", "correctIndex", "explanation"],
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correctIndex: { type: "integer" },
            explanation: { type: "string" },
          },
        },
      },
    },
  },
};

function buildPrompt(topicName: string, quizNumber: number, existingTitles: string[]): string {
  const lines = [
    `=== QUIZ SIZE (MANDATORY) ===`,
    `Generate EXACTLY ${QUESTIONS_PER_QUIZ} questions. Count carefully before finishing.`,
    ``,
    `=== TOPIC ===`,
    `Generate a quiz on "${topicName}".`,
    `This is quiz ${quizNumber} of ${QUIZZES_PER_TOPIC} in this topic series.`,
    `CRITICAL: Focus on ONE narrow subtopic area — do NOT spread across the whole topic. Go deep on a specific slice.`,
    `Generate a short "title" (2–4 words) naming the SPECIFIC narrow area. Good: "Pricing & Elasticity", "Classical Conditioning", "Orbital Mechanics", "Color Theory". Bad: "Cognitive Processes & Development", "Fundamentals & Strategies". The title should describe a single chapter, not a textbook.`,
  ];

  if (existingTitles.length > 0) {
    lines.push(``);
    lines.push(`=== ALREADY COVERED (DO NOT REPEAT) ===`);
    lines.push(`These subtopics are taken by other quizzes. You MUST pick a DIFFERENT area:`);
    for (const t of existingTitles) {
      lines.push(`- "${t}"`);
    }
  }

  lines.push(``);
  lines.push(`Focus on widely accepted facts, foundational concepts, and key ideas.`);
  lines.push(`Vary the types of questions: definitions, cause-effect, comparisons, applications, and historical context.`);
  lines.push(``);
  lines.push(`Use general, widely accepted knowledge about this subject.`);

  return lines.join("\n");
}

type QuizPayload = {
  topic: string;
  title: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
};

async function generateQuiz(
  openai: OpenAI,
  topicName: string,
  quizNumber: number,
  existingTitles: string[] = [],
): Promise<QuizPayload> {
  const model = process.env.OPENAI_QUIZ_MODEL ?? "gpt-4.1-mini";
  const res = await openai.chat.completions.create(
    {
      model,
      temperature: 0.5, // slightly higher than app (0.35) for variety across quizzes
      max_tokens: Math.max(6000, QUESTIONS_PER_QUIZ * 300),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: QUIZ_JSON_SCHEMA.name,
          strict: true,
          schema: QUIZ_JSON_SCHEMA.schema,
        },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(topicName, quizNumber, existingTitles) },
      ],
    },
    { timeout: 120_000 },
  );

  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from model");

  const payload = JSON.parse(text) as QuizPayload;

  // Basic validation
  if (!payload.questions || payload.questions.length < QUESTIONS_PER_QUIZ - 5) {
    throw new Error(
      `Expected ~${QUESTIONS_PER_QUIZ} questions, got ${payload.questions?.length ?? 0}`,
    );
  }

  // Ensure each question has exactly 4 options and valid correctIndex
  for (const q of payload.questions) {
    if (!q.options || q.options.length !== 4) {
      throw new Error(`Question "${q.question?.slice(0, 40)}..." has ${q.options?.length} options instead of 4`);
    }
    if (q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error(`Invalid correctIndex ${q.correctIndex}`);
    }
    // Ensure ID exists
    if (!q.id) q.id = randomUUID();
  }

  return payload;
}

function quizTitle(generatedTitle: string): string {
  // Use the AI-generated short subtitle (e.g. "Mechanics & Forces")
  return generatedTitle.slice(0, 60);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
  if (!apiKey) {
    console.error("[seed] OPENAI_API_KEY not set. Cannot generate quizzes.");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  console.log("[seed] Starting pre-made quiz generation...");

  // 1. Upsert system user
  const systemUser = await prisma.user.upsert({
    where: { email: SYSTEM_EMAIL },
    update: {},
    create: {
      email: SYSTEM_EMAIL,
      name: "System",
      role: "user",
      subscriptionTier: "free",
    },
  });
  console.log(`[seed] System user: ${systemUser.id}`);

  // 2. Upsert all topics
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i]!;
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: { name: t.name, description: t.description, icon: t.icon, color: t.color, sortOrder: i },
      create: { slug: t.slug, name: t.name, description: t.description, icon: t.icon, color: t.color, sortOrder: i },
    });
  }
  console.log(`[seed] ${TOPICS.length} topics upserted.`);

  // 3. Generate quizzes
  const allTopics = await prisma.topic.findMany({ orderBy: { sortOrder: "asc" } });
  let generated = 0;
  let skipped = 0;

  for (const topic of allTopics) {
    // Collect existing titles for this topic to avoid repetition
    const existingQuizzes = await prisma.premadeQuiz.findMany({
      where: { topicId: topic.id },
      select: { title: true, quizNumber: true },
      orderBy: { quizNumber: "asc" },
    });
    const topicTitles = existingQuizzes.map((q) => q.title);

    for (let qn = 1; qn <= QUIZZES_PER_TOPIC; qn++) {
      // Check if already exists
      const existing = existingQuizzes.find((q) => q.quizNumber === qn);
      if (existing) {
        skipped++;
        continue;
      }

      const label = `[seed] Topic ${allTopics.indexOf(topic) + 1}/${allTopics.length} "${topic.name}" — Quiz ${qn}/${QUIZZES_PER_TOPIC}`;
      console.log(`${label} — generating...`);

      try {
        const payload = await generateQuiz(openai, topic.name, qn, topicTitles);
        const title = quizTitle(payload.title || `${topic.name} Quiz ${qn}`);
        topicTitles.push(title); // track for next quiz in this topic

        // Persist in a transaction
        await prisma.$transaction(async (tx) => {
          const quizRequest = await tx.quizRequest.create({
            data: {
              userId: systemUser.id,
              title,
              summaryText: `Pre-made quiz on ${topic.name}`,
              questionCount: payload.questions.length,
              topic: payload.topic || topic.name,
              generatedQuiz: JSON.stringify(payload),
              isPremade: true,
              usedFallback: false,
              questions: {
                create: payload.questions.map((q, idx) => ({
                  order: idx,
                  question: q.question,
                  options: JSON.stringify(q.options),
                  correctIndex: q.correctIndex,
                  explanation: q.explanation,
                })),
              },
            },
          });

          await tx.premadeQuiz.create({
            data: {
              topicId: topic.id,
              quizRequestId: quizRequest.id,
              title,
              quizNumber: qn,
            },
          });
        });

        generated++;
        console.log(`${label} — done (${payload.questions.length} questions)`);
      } catch (err) {
        console.error(`${label} — FAILED:`, err instanceof Error ? err.message : err);
        // Continue to next quiz — idempotent, can retry later
      }

      // Rate limit delay
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n[seed] Complete! Generated: ${generated}, Skipped (already exist): ${skipped}`);
}

main()
  .catch((err) => {
    console.error("[seed] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
