import { randomUUID } from "crypto";
import type { AIClient, JsonSchema } from "./ai";
import {
  type QuizPayload,
  quizPayloadSchema,
  quizQuestionSchema,
  type QuestionCount,
} from "./schemas/quiz";
import { z } from "zod";

/**
 * OpenAI strict-mode JSON schema for the full quiz payload. The Zod schema in
 * `schemas/quiz.ts` is the runtime source of truth — this mirrors its shape so
 * the model is forced to emit valid JSON in one shot (no parse / shape retries).
 *
 * Strict-mode caveats: no `minItems`/`maxItems`/`minLength`. Array length and
 * "EXACTLY 4 options" are still enforced via prompt + downstream validation.
 */
const QUIZ_JSON_SCHEMA: JsonSchema = {
  name: "quiz_payload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["topic", "questions"],
    properties: {
      topic: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "question", "options", "correctIndex", "explanation"],
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
            },
            correctIndex: { type: "integer" },
            explanation: { type: "string" },
          },
        },
      },
    },
  },
};

/** Top-up payload schema (subset of the full quiz schema). */
const TOP_UP_JSON_SCHEMA: JsonSchema = {
  name: "quiz_top_up",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "question", "options", "correctIndex", "explanation"],
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
            },
            correctIndex: { type: "integer" },
            explanation: { type: "string" },
          },
        },
      },
    },
  },
};

export const QUIZ_SYSTEM_PROMPT = `You are an expert learning designer who writes high-quality multiple-choice quizzes for retrieval practice.

OUTPUT RULES (STRICT):
- Respond with a single JSON object only. No markdown, no code fences, no commentary before or after JSON.
- The JSON must match this TypeScript shape:
  {
    "topic": string,
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
- QUESTION STEMS (READ CAREFULLY): Each "question" string must be self-contained and unambiguous. Name the specific concept, claim, entity, or chapter-level idea being tested (e.g. start with the topic or theory). Do NOT use vague stems like "Which is true?" or "What does it suggest?" without stating what "it" refers to. Avoid bare pronouns ("this", "it", "they") unless the referent is in the same sentence. Use one or two full sentences if needed so the learner knows exactly what dimension they are judging (definition, mechanism, implication, contrast, etc.).
- Use neutral, precise wording. Avoid "all of the above" / "none of the above".
- If the user supplies substantive text (summary and/or notes), base questions ONLY on that material.
- If the user provides ONLY a title/name with little or no substantive text, you may use general, widely accepted knowledge about that source IF it is a well-known public work or topic; otherwise keep questions conservative and tied to any hints given.
- Generate stable unique "id" values as random UUID strings for each question.
- If you risk running out of space, prioritize finishing all N questions with valid 4-option items over long explanations.

QUALITY BAR:
- Vary difficulty slightly across the set, but keep every item fair and clearly answerable from the allowed knowledge.
- Order questions so difficulty tends to increase from the start of the array toward the end (early items slightly easier, later items slightly harder), without making any item unfair.
- Explanations should reinforce the correct idea without introducing new unrelated claims.`;

function buildSourceInputBlock(input: {
  title?: string | null;
  summaryText: string;
  notes?: string | null;
}): string {
  const parts: string[] = ["SOURCE INPUT:"];
  if (input.title?.trim()) parts.push(`Title / source name: ${input.title.trim()}`);
  if (input.summaryText.trim())
    parts.push(`Summary / key points:\n${input.summaryText.trim()}`);
  if (input.notes?.trim()) parts.push(`Additional notes:\n${input.notes.trim()}`);
  if (!input.title?.trim() && !input.summaryText.trim() && !input.notes?.trim()) {
    parts.push(
      "(No title or text provided — ask for clarification in JSON by returning topic explaining missing input and empty questions array)",
    );
  }
  return parts.join("\n");
}

function buildUserPrompt(input: {
  title?: string | null;
  summaryText: string;
  notes?: string | null;
  questionCount: QuestionCount;
}): string {
  const n = input.questionCount;
  const parts = [
    "=== QUIZ SIZE (MANDATORY) ===",
    `The JSON field "questions" MUST be an array of length exactly ${n} (not ${n - 1}, not ${n + 1}).`,
    `Integer N for this request: ${n}`,
    "=== END QUIZ SIZE ===",
    "",
    `Generate a quiz with EXACTLY ${n} multiple-choice questions.`,
    "",
    buildSourceInputBlock(input),
  ];
  return parts.join("\n");
}

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return s.trim();
}

function normalizeIds(payload: QuizPayload): QuizPayload {
  return {
    topic: payload.topic,
    questions: payload.questions.map((q) => ({
      ...q,
      id: q.id?.trim() ? q.id : randomUUID(),
    })),
  };
}

// With OpenAI structured outputs, JSON / shape errors are no longer possible,
// so the only failure modes left are network errors and the model returning
// the wrong number of questions. 2 attempts is plenty.
const QUIZ_MAX_ATTEMPTS = 2;

const TOP_UP_SYSTEM_PROMPT = `You add questions to an existing multiple-choice quiz. Output one JSON object only (no markdown, no code fences).
Shape: { "questions": [ ... ] } — nothing else at the top level.
Each question: id (UUID string), question, options (EXACTLY 4 distinct strings), correctIndex (0–3), explanation (brief).
Each "question" stem must name the specific idea being tested (no vague "which is true?" without context; no unclear "it/this").
The user states how many items must appear in "questions"; that length must match exactly.`;

const topUpPayloadSchema = z.object({
  questions: z.array(quizQuestionSchema),
});

function mergeAppendedQuestions(
  existing: QuizPayload["questions"],
  incoming: QuizPayload["questions"],
  cap: number,
): QuizPayload["questions"] {
  const seen = new Set(existing.map((q) => q.question.trim().toLowerCase()));
  const out = [...existing];
  for (const q of incoming) {
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...q, id: q.id?.trim() ? q.id : randomUUID() });
    if (out.length >= cap) break;
  }
  return out;
}

async function tryTopUpToCount(
  ai: AIClient,
  input: {
    title?: string | null;
    summaryText: string;
    notes?: string | null;
    questionCount: QuestionCount;
  },
  topic: string,
  startPayload: QuizPayload,
): Promise<QuizPayload | null> {
  const n = input.questionCount;
  let questions = normalizeIds(startPayload).questions;
  // With structured outputs the first call almost always returns the right
  // count; 2 top-up rounds is enough to recover from a rare under-count.
  const maxRounds = 2;

  for (let round = 0; round < maxRounds && questions.length < n; round++) {
    const need = n - questions.length;
    const previewList =
      questions.length > 15
        ? [
            `(There are ${questions.length} existing questions; below are the last 15 stems — new items must differ from all, including earlier ones.)`,
            ...questions.slice(-15).map((q, i) => `${questions.length - 15 + i + 1}. ${q.question.trim().slice(0, 140)}`),
          ]
        : questions.map((q, i) => `${i + 1}. ${q.question.trim().slice(0, 140)}`);
    const stemsPreview = previewList.join("\n");

    const user = [
      `Quiz topic: ${topic}`,
      "",
      buildSourceInputBlock(input),
      "",
      `The quiz already has ${questions.length} questions. You must output ONLY a JSON object: { "questions": [ ... ] }.`,
      `"questions" MUST be an array of length exactly ${need} (not ${need - 1}, not ${need + 1}).`,
      "New questions must cover different facts/angles than these existing stems (do not paraphrase the same idea):",
      stemsPreview,
    ].join("\n");

    let raw: string;
    try {
      raw = await ai.completeJson({
        system: TOP_UP_SYSTEM_PROMPT,
        user,
        jsonSchema: TOP_UP_JSON_SCHEMA,
      });
    } catch (err) {
      logDev(`Top-up OpenAI request failed (round ${round + 1}):`, err);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch (e) {
      logDev(`Top-up invalid JSON (round ${round + 1}):`, e);
      continue;
    }

    const result = topUpPayloadSchema.safeParse(parsed);
    if (!result.success) {
      logDev(`Top-up Zod failed (round ${round + 1}):`, result.error.flatten());
      continue;
    }

    let extra = result.data.questions;
    if (extra.length > need) {
      extra = extra.slice(0, need);
    }

    questions = mergeAppendedQuestions(questions, extra, n);

    if (questions.length >= n) {
      questions = questions.slice(0, n);
      break;
    }

    logDev(
      `Top-up round ${round + 1}: needed ${need}, got ${extra.length} valid new; total now ${questions.length}.`,
    );
  }

  if (questions.length !== n) return null;

  const merged: QuizPayload = { topic, questions };
  if (!questionsHaveFourDistinctOptions(merged)) return null;
  return merged;
}

function questionsHaveFourDistinctOptions(payload: QuizPayload): boolean {
  return payload.questions.every((q) => {
    const opts = new Set(q.options.map((o) => o.trim().toLowerCase()));
    return opts.size === 4;
  });
}

export type FallbackReason =
  | "no_api_key"
  | "openai_error"
  | "invalid_json"
  | "schema_invalid"
  | "wrong_question_count"
  | "duplicate_options";

function logDev(message: string, extra?: unknown) {
  if (process.env.NODE_ENV === "development") {
    if (extra !== undefined) console.error("[quiz-generator]", message, extra);
    else console.error("[quiz-generator]", message);
  }
}

export async function generateQuizPayload(
  ai: AIClient | null,
  input: {
    title?: string | null;
    summaryText: string;
    notes?: string | null;
    questionCount: QuestionCount;
  },
): Promise<{
  payload: QuizPayload;
  rawModelJson?: string;
  usedFallback: boolean;
  fallbackReason?: FallbackReason;
}> {
  const userPrompt = buildUserPrompt(input);

  if (!ai) {
    logDev("No OPENAI_API_KEY — using built-in sample quiz.");
    return {
      payload: buildFallbackQuiz(input),
      usedFallback: true,
      fallbackReason: "no_api_key",
    };
  }

  const n = input.questionCount;
  let lastRaw: string | undefined;
  let lastFailure: FallbackReason = "wrong_question_count";

  for (let attempt = 0; attempt < QUIZ_MAX_ATTEMPTS; attempt++) {
    const retryHint =
      attempt === 0
        ? ""
        : `\n\nCRITICAL — retry ${attempt + 1}/${QUIZ_MAX_ATTEMPTS}: questions.length MUST equal ${n} (the user selected ${n} questions in the app). Open your JSON and count array elements. Each item needs 4 distinct options.`;

    let raw: string;
    try {
      raw = await ai.completeJson({
        system: QUIZ_SYSTEM_PROMPT,
        user: userPrompt + retryHint,
        jsonSchema: QUIZ_JSON_SCHEMA,
      });
    } catch (err) {
      logDev(`OpenAI request failed (attempt ${attempt + 1}):`, err);
      lastFailure = "openai_error";
      continue;
    }

    lastRaw = raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch (e) {
      logDev(`Invalid JSON (attempt ${attempt + 1}):`, e);
      lastFailure = "invalid_json";
      continue;
    }

    const result = quizPayloadSchema.safeParse(parsed);
    if (!result.success) {
      logDev(`Zod validation failed (attempt ${attempt + 1}):`, result.error.flatten());
      lastFailure = "schema_invalid";
      continue;
    }

    let payload = normalizeIds(result.data);

    if (payload.questions.length > n) {
      logDev(
        `Trimming questions ${payload.questions.length} → ${n} (model returned extras).`,
      );
      payload = {
        ...payload,
        questions: payload.questions.slice(0, n),
      };
    }

    if (payload.questions.length < n) {
      if (payload.questions.length > 0) {
        logDev(
          `Expected ${n} questions, got ${payload.questions.length} — attempting top-up.`,
        );
        const merged = await tryTopUpToCount(
          ai,
          input,
          payload.topic,
          payload,
        );
        if (
          merged &&
          merged.questions.length === n &&
          questionsHaveFourDistinctOptions(merged)
        ) {
          return { payload: merged, rawModelJson: lastRaw, usedFallback: false };
        }
      }
      logDev(
        `Expected ${n} questions, got ${payload.questions.length} — retrying full generation.`,
      );
      lastFailure = "wrong_question_count";
      continue;
    }

    if (!questionsHaveFourDistinctOptions(payload)) {
      logDev(`Duplicate or missing options (attempt ${attempt + 1}) — retrying.`);
      lastFailure = "duplicate_options";
      continue;
    }

    return { payload, rawModelJson: raw, usedFallback: false };
  }

  logDev(`Giving up after ${QUIZ_MAX_ATTEMPTS} attempts; last issue: ${lastFailure}`);
  return {
    payload: buildFallbackQuiz(input),
    rawModelJson: lastRaw,
    usedFallback: true,
    fallbackReason: lastFailure,
  };
}

export function buildPromptBundle(input: {
  title?: string | null;
  summaryText: string;
  notes?: string | null;
  questionCount: QuestionCount;
}): { system: string; user: string } {
  return {
    system: QUIZ_SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  };
}

function buildFallbackQuiz(input: {
  title?: string | null;
  summaryText: string;
  notes?: string | null;
  questionCount: QuestionCount;
}): QuizPayload {
  const topic =
    input.title?.trim() ||
    (input.summaryText.trim()
      ? "Practice set (from your summary)"
      : "Memorize — sample quiz");
  const base =
    input.summaryText.trim().slice(0, 200) ||
    "This is placeholder content for local testing without an OpenAI API key.";
  const n = input.questionCount;
  const questions = Array.from({ length: n }, (_, i) => ({
    id: randomUUID(),
    question: `Sample question ${i + 1} of ${n}: Which statement best reflects the idea of retrieval practice?`,
    options: [
      "Actively recalling information strengthens memory more than passive re-reading alone.",
      "Highlighting text once guarantees long-term retention.",
      "Skipping review until the night before is optimal for mastery.",
      "Memory improves only if you avoid testing yourself.",
    ],
    correctIndex: 0,
    explanation:
      "Research on retrieval practice shows that actively recalling information improves long-term retention compared with passive restudy.",
  }));
  return {
    topic: `${topic} (fallback)`,
    questions: questions.map((q, idx) => ({
      ...q,
      question: `(${idx + 1}/${n}) ${q.question}`,
      explanation: `${q.explanation} Context hint: ${base.slice(0, 120)}…`,
    })),
  };
}
