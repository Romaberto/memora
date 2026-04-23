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
- DUPLICATE CONTROL (CRITICAL FOR LARGE QUIZZES): Every question must test a distinct target fact, relationship, example, mechanism, implication, or contrast. Do NOT create multiple questions that are paraphrases of the same idea. Do NOT reuse the same correct answer in slightly different wording. Do NOT repeat the same generic stem pattern more than a few times.
- For quizzes with 30, 40, or 50 questions, privately create a coverage plan before writing JSON. Spread questions across different angles: definitions, mechanisms, cause/effect, comparisons, examples, exceptions, chronology/sequence, application scenarios, misconceptions, consequences, and synthesis. The final JSON should contain only the quiz, not the plan.
- Long quizzes should feel like a broad study session, not the same 5-7 questions rewritten. If the source is narrow, vary the level of analysis instead of repeating the same surface fact.
- Use neutral, precise wording. Avoid "all of the above" / "none of the above".
- If the user supplies substantive text (summary and/or notes), base questions ONLY on that material.
- If the user provides ONLY a title/name with little or no substantive text, you may use general, widely accepted knowledge about that source IF it is a well-known public work or topic; otherwise keep questions conservative and tied to any hints given.
- Generate stable unique "id" values as random UUID strings for each question.
- If you risk running out of space, prioritize finishing all N questions with valid 4-option items over long explanations.
- LANGUAGE MATCHING (CRITICAL): Match the dominant language of the user's source text. If the title, summary, or notes are in Ukrainian, write the topic, every question, every option, and every explanation in Ukrainian. Apply the same rule for Spanish, Portuguese, Polish, French, German, Italian, Turkish, Russian, and English. Do not silently switch to English unless the source text is clearly English or too short to infer another language confidently.

QUALITY BAR:
- Vary difficulty slightly across the set, but keep every item fair and clearly answerable from the allowed knowledge.
- Order questions so difficulty tends to increase from the start of the array toward the end (early items slightly easier, later items slightly harder), without making any item unfair.
- Explanations should reinforce the correct idea without introducing new unrelated claims.`;

type LanguageHint = {
  label: string;
  reason: string;
};

function makeLanguageWordPattern(words: string[]): RegExp {
  return new RegExp(
    `(?:^|[\\s.,!?;:()"'/-])(${words.join("|")})(?=[\\s.,!?;:()"'/-]|$)`,
    "giu",
  );
}

const LANGUAGE_RULES: Array<{
  label: string;
  score: (text: string) => number;
}> = [
  {
    label: "Ukrainian",
    score: (text) =>
      countMatches(text, /[іїєґІЇЄҐ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "та",
          "це",
          "для",
          "про",
          "як",
          "що",
          "який",
          "яка",
          "книга",
          "гра",
          "лекція",
          "конспект",
        ]),
      ) *
        2,
  },
  {
    label: "Russian",
    score: (text) =>
      countMatches(text, /[ёъыэЁЪЫЭ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "это",
          "как",
          "что",
          "книга",
          "игра",
          "лекция",
          "конспект",
          "какой",
          "какая",
        ]),
      ) *
        2,
  },
  {
    label: "Polish",
    score: (text) =>
      countMatches(text, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "czy",
          "jak",
          "książka",
          "notatki",
          "wykład",
          "temat",
          "który",
          "która",
        ]),
      ) *
        2,
  },
  {
    label: "Portuguese",
    score: (text) =>
      countMatches(text, /[ãõçÃÕÇ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "não",
          "como",
          "para",
          "livro",
          "resumo",
          "anotações",
          "qual",
          "uma",
        ]),
      ) *
        2,
  },
  {
    label: "Spanish",
    score: (text) =>
      countMatches(text, /[ñÑ¡¿]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "como",
          "para",
          "libro",
          "resumen",
          "notas",
          "tema",
          "cuál",
          "una",
        ]),
      ) *
        2,
  },
  {
    label: "French",
    score: (text) =>
      countMatches(text, /[àâçéèêëîïôùûüœÀÂÇÉÈÊËÎÏÔÙÛÜŒ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "avec",
          "pour",
          "livre",
          "résumé",
          "notes",
          "cours",
          "quel",
          "quelle",
        ]),
      ) *
        2,
  },
  {
    label: "German",
    score: (text) =>
      countMatches(text, /[äöüßÄÖÜ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "und",
          "wie",
          "buch",
          "notizen",
          "vorlesung",
          "thema",
          "welche",
          "welcher",
        ]),
      ) *
        2,
  },
  {
    label: "Italian",
    score: (text) =>
      countMatches(
        text,
        makeLanguageWordPattern([
          "come",
          "libro",
          "riassunto",
          "appunti",
          "lezione",
          "tema",
          "quale",
          "una",
        ]),
      ) * 2,
  },
  {
    label: "Turkish",
    score: (text) =>
      countMatches(text, /[çğıİöşüÇĞİIÖŞÜ]/g) * 3 +
      countMatches(
        text,
        makeLanguageWordPattern([
          "ve",
          "nasıl",
          "kitap",
          "özet",
          "notlar",
          "konu",
          "hangi",
          "bir",
        ]),
      ) *
        2,
  },
];

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function inferOutputLanguage(input: {
  title?: string | null;
  summaryText: string;
  notes?: string | null;
}): LanguageHint {
  const combined = [input.title, input.summaryText, input.notes]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n");

  if (!combined) {
    return {
      label: "English",
      reason: "No source text was provided, so default to English.",
    };
  }

  const winner = LANGUAGE_RULES.map((rule) => ({
    label: rule.label,
    score: rule.score(combined),
  })).sort((a, b) => b.score - a.score)[0];

  if (winner && winner.score >= 4) {
    return {
      label: winner.label,
      reason: `Detected ${winner.label} cues in the source text.`,
    };
  }

  return {
    label: "English",
    reason: "The source text looks mostly English or too mixed to infer another language confidently.",
  };
}

function buildCoveragePlan(n: QuestionCount): string {
  if (n <= 10) {
    return [
      "COVERAGE PLAN:",
      "- Use 10 distinct learning targets. Avoid asking the same fact twice.",
      "- Mix direct recall with at least a few application or contrast questions.",
    ].join("\n");
  }

  const bands =
    n >= 50
      ? [
          "1-5: core definitions and key claims",
          "6-10: mechanisms, processes, or how-things-work questions",
          "11-15: cause/effect and consequence questions",
          "16-20: comparisons and contrasts between concepts",
          "21-25: examples, applications, and scenario-based recall",
          "26-30: misconceptions, edge cases, and exceptions",
          "31-35: chronology, sequence, or structure where relevant",
          "36-40: deeper implications and tradeoffs",
          "41-45: synthesis across multiple parts of the source",
          "46-50: harder but fair review questions with distinct targets",
        ]
      : [
          "First quarter: core definitions and key claims",
          "Second quarter: mechanisms, cause/effect, and examples",
          "Third quarter: comparisons, applications, and misconceptions",
          "Final quarter: synthesis, implications, and harder review questions",
        ];

  return [
    "COVERAGE PLAN FOR THIS QUIZ:",
    `- Create exactly ${n} distinct target facts before writing questions.`,
    "- Map each question to one target fact. No target fact may be reused.",
    "- Avoid repeating the same stem template across the set.",
    ...bands.map((band) => `- ${band}`),
  ].join("\n");
}

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
  const languageHint = inferOutputLanguage(input);
  const parts = [
    "=== QUIZ SIZE (MANDATORY) ===",
    `The JSON field "questions" MUST be an array of length exactly ${n} (not ${n - 1}, not ${n + 1}).`,
    `Integer N for this request: ${n}`,
    "=== END QUIZ SIZE ===",
    "",
    `Generate a quiz with EXACTLY ${n} multiple-choice questions.`,
    `OUTPUT LANGUAGE: ${languageHint.label}. ${languageHint.reason}`,
    `Everything user-facing in the JSON must stay in ${languageHint.label}: topic, question stems, answer options, and explanations.`,
    "",
    buildCoveragePlan(n),
    "",
    buildSourceInputBlock(input),
    "",
    `FINAL REMINDER: Your output MUST contain exactly ${n} questions. Count them before responding.`,
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

// With OpenAI structured outputs, JSON / shape errors are rare, but content
// quality still needs a local gate. 3 attempts with top-up covers edge cases
// without turning quiz generation into a long-running repair loop.
const QUIZ_MAX_ATTEMPTS = 3;

const TOP_UP_SYSTEM_PROMPT = `You add questions to an existing multiple-choice quiz. Output one JSON object only (no markdown, no code fences).
Shape: { "questions": [ ... ] } — nothing else at the top level.
Each question: id (UUID string), question, options (EXACTLY 4 distinct strings), correctIndex (0–3), explanation (brief).
Each "question" stem must name the specific idea being tested (no vague "which is true?" without context; no unclear "it/this").
Every new question must test a distinct target fact. Do not paraphrase existing questions. Do not reuse the same correct answer with a lightly rewritten stem.
Match the dominant language of the provided source text and existing quiz. Keep every new question, option, and explanation in that same language.
The user states how many items must appear in "questions"; that length must match exactly.`;

const topUpPayloadSchema = z.object({
  questions: z.array(quizQuestionSchema),
});

const QUESTION_STOP_WORDS = new Set([
  "about",
  "above",
  "according",
  "after",
  "again",
  "against",
  "also",
  "among",
  "answer",
  "because",
  "before",
  "being",
  "best",
  "between",
  "could",
  "describe",
  "describes",
  "does",
  "during",
  "each",
  "from",
  "given",
  "have",
  "how",
  "into",
  "main",
  "most",
  "question",
  "rather",
  "should",
  "statement",
  "suggest",
  "suggests",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "true",
  "what",
  "when",
  "where",
  "which",
  "while",
  "why",
  "with",
  "who",
  "would",
]);

const NON_WORD_OR_SPACE = new RegExp("[^\\p{L}\\p{N}\\s]", "gu");

function normalizeQuestionText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(NON_WORD_OR_SPACE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionKeywordTokens(value: string): Set<string> {
  const tokens = normalizeQuestionText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !QUESTION_STOP_WORDS.has(token))
    .map((token) =>
      token
        .replace(/(?:ing|tion|ions|ed|es|s)$/, "")
        .replace(/^\d+$/, ""),
    )
    .filter((token) => token.length >= 3 && !QUESTION_STOP_WORDS.has(token));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function overlapSimilarity(a: Set<string>, b: Set<string>): number {
  const smaller = Math.min(a.size, b.size);
  if (smaller === 0) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection++;
  });
  return intersection / smaller;
}

function questionsAreTooSimilar(
  a: QuizPayload["questions"][number],
  b: QuizPayload["questions"][number],
): boolean {
  const aText = normalizeQuestionText(a.question);
  const bText = normalizeQuestionText(b.question);
  if (aText === bText) return true;

  const aTokens = questionKeywordTokens(a.question);
  const bTokens = questionKeywordTokens(b.question);
  const jaccard = jaccardSimilarity(aTokens, bTokens);
  const overlap = overlapSimilarity(aTokens, bTokens);

  // Jaccard catches paraphrases with near-identical keyword sets. Overlap
  // catches "same question plus one clause" variants without punishing broad
  // quizzes where several stems naturally share the source/topic name.
  return jaccard >= 0.72 || (overlap >= 0.88 && jaccard >= 0.58);
}

function dedupeSimilarQuestions(
  questions: QuizPayload["questions"],
): {
  questions: QuizPayload["questions"];
  removedCount: number;
} {
  const out: QuizPayload["questions"] = [];
  for (const question of questions) {
    if (out.some((existing) => questionsAreTooSimilar(existing, question))) {
      continue;
    }
    out.push(question);
  }
  return {
    questions: out,
    removedCount: questions.length - out.length,
  };
}

function mergeAppendedQuestions(
  existing: QuizPayload["questions"],
  incoming: QuizPayload["questions"],
  cap: number,
): QuizPayload["questions"] {
  const out = [...existing];
  for (const q of incoming) {
    if (out.some((existingQuestion) => questionsAreTooSimilar(existingQuestion, q))) {
      continue;
    }
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
  const languageHint = inferOutputLanguage(input);
  let questions = normalizeIds(startPayload).questions;
  // With structured outputs the first call almost always returns the right
  // count; 2 top-up rounds is enough to recover from a rare under-count.
  const maxRounds = 2;

  for (let round = 0; round < maxRounds && questions.length < n; round++) {
    const need = n - questions.length;
    const previewList =
      questions.length > 60
        ? [
            `(There are ${questions.length} existing questions; below are the last 60 stems — new items must differ from all, including earlier ones.)`,
            ...questions.slice(-60).map((q, i) => `${questions.length - 60 + i + 1}. ${q.question.trim().slice(0, 160)}`),
          ]
        : questions.map((q, i) => `${i + 1}. ${q.question.trim().slice(0, 160)}`);
    const stemsPreview = previewList.join("\n");

    const user = [
      `Quiz topic: ${topic}`,
      `OUTPUT LANGUAGE: ${languageHint.label}. ${languageHint.reason}`,
      `Every new question, option, and explanation must remain in ${languageHint.label}.`,
      "",
      buildSourceInputBlock(input),
      "",
      `The quiz already has ${questions.length} questions. You must output ONLY a JSON object: { "questions": [ ... ] }.`,
      `"questions" MUST be an array of length exactly ${need} (not ${need - 1}, not ${need + 1}).`,
      buildCoveragePlan(input.questionCount),
      "",
      "New questions must cover different facts/angles than these existing stems (do not paraphrase the same idea):",
      stemsPreview,
    ].join("\n");

    let raw: string;
    try {
      raw = await ai.completeJson({
        system: TOP_UP_SYSTEM_PROMPT,
        user,
        jsonSchema: TOP_UP_JSON_SCHEMA,
        maxTokens: Math.max(2500, need * 260),
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
    const deduped = dedupeSimilarQuestions(questions);
    questions = deduped.questions;

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
  | "duplicate_options"
  | "repetitive_questions";

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
        : `\n\nCRITICAL — retry ${attempt + 1}/${QUIZ_MAX_ATTEMPTS}: questions.length MUST equal ${n} (the user selected ${n} questions in the app). Open your JSON and count array elements. Each item needs 4 distinct options. The previous attempt failed because of ${lastFailure}; avoid repeated target facts and paraphrased stems.`;

    let raw: string;
    try {
      // Scale max_tokens based on question count. Each question with 4 options
      // + explanation averages ~200-250 tokens in structured JSON output.
      // Use 250/q to avoid truncation, especially at 40-50 questions.
      const maxTokens = Math.max(4000, input.questionCount * 250);
      raw = await ai.completeJson({
        system: QUIZ_SYSTEM_PROMPT,
        user: userPrompt + retryHint,
        jsonSchema: QUIZ_JSON_SCHEMA,
        maxTokens,
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

    const deduped = dedupeSimilarQuestions(payload.questions);
    if (deduped.removedCount > 0) {
      logDev(
        `Removed ${deduped.removedCount} repetitive question(s) (attempt ${attempt + 1}).`,
      );
      payload = { ...payload, questions: deduped.questions };
      lastFailure = "repetitive_questions";
    }

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
        `Expected ${n} unique questions, got ${payload.questions.length} — retrying full generation.`,
      );
      if (lastFailure !== "repetitive_questions") {
        lastFailure = "wrong_question_count";
      }
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
  const languageHint = inferOutputLanguage(input);
  const topic =
    input.title?.trim() ||
    (input.summaryText.trim()
      ? "Practice set (from your summary)"
      : "Memorize — sample quiz");
  const base =
    input.summaryText.trim().slice(0, 200) ||
    "This is placeholder content for local testing without an OpenAI API key.";
  const n = input.questionCount;
  const templates = [
    {
      stem: "Which study habit best supports durable recall?",
      correct: "Actively recalling the material before checking notes.",
      distractors: [
        "Re-reading the same paragraph without pausing.",
        "Highlighting every sentence in the source.",
        "Waiting until the final review session to test memory.",
      ],
    },
    {
      stem: "What is the main value of spacing review sessions?",
      correct: "It gives memory time to weaken slightly before being strengthened again.",
      distractors: [
        "It removes the need for future retrieval practice.",
        "It makes every review feel equally easy.",
        "It guarantees mastery after one session.",
      ],
    },
    {
      stem: "Why should a learner explain an answer after choosing it?",
      correct: "Explanation connects the answer to the underlying idea.",
      distractors: [
        "Explanation replaces the need for feedback.",
        "Explanation matters only when the answer was wrong.",
        "Explanation should introduce unrelated facts.",
      ],
    },
    {
      stem: "What makes a multiple-choice distractor useful for practice?",
      correct: "It is plausible enough to reveal a real misconception.",
      distractors: [
        "It is obviously silly so the correct answer stands out.",
        "It repeats the exact wording of the correct answer.",
        "It combines several unrelated ideas at once.",
      ],
    },
    {
      stem: "Which sign suggests a quiz question is too vague?",
      correct: "The learner cannot tell which concept the stem is asking about.",
      distractors: [
        "The question names the concept being tested.",
        "The options are parallel in length and style.",
        "The explanation reinforces the correct idea.",
      ],
    },
    {
      stem: "What should change as a quiz becomes longer?",
      correct: "The questions should cover more distinct angles of the source.",
      distractors: [
        "The same fact should be repeated with new wording.",
        "Explanations should become unrelated to the answer.",
        "Options should become easier to guess from phrasing.",
      ],
    },
    {
      stem: "Which approach best supports application-level learning?",
      correct: "Ask how a concept works in a concrete scenario.",
      distractors: [
        "Ask only for the title of the source.",
        "Ask the same definition many times.",
        "Avoid examples because they add context.",
      ],
    },
    {
      stem: "Why is feedback important after retrieval practice?",
      correct: "It corrects errors before they become reinforced.",
      distractors: [
        "It makes guessing more valuable than recall.",
        "It prevents learners from needing to think.",
        "It should hide the reason an answer is correct.",
      ],
    },
  ];
  const questions = Array.from({ length: n }, (_, i) => ({
    id: randomUUID(),
    question: `Local fallback item ${i + 1} of ${n}: ${
      templates[i % templates.length].stem
    }`,
    options: [
      templates[i % templates.length].correct,
      ...templates[i % templates.length].distractors,
    ],
    correctIndex: 0,
    explanation:
      "This local fallback keeps the app usable without the AI provider, but production quizzes should come from the model and source text.",
  }));
  return {
    topic:
      languageHint.label === "English" ? `${topic} (fallback)` : topic,
    questions: questions.map((q, idx) => ({
      ...q,
      question: `(${idx + 1}/${n}) ${q.question}`,
      explanation:
        languageHint.label === "English"
          ? `${q.explanation} Context hint: ${base.slice(0, 120)}…`
          : q.explanation,
    })),
  };
}
