import { z } from "zod";

export const QUESTION_COUNTS = [10, 20, 30, 40, 50] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];

export function isQuestionCount(n: number): n is QuestionCount {
  return (QUESTION_COUNTS as readonly number[]).includes(n);
}

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export const quizPayloadSchema = z.object({
  topic: z.string().min(1),
  questions: z.array(quizQuestionSchema),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizPayload = z.infer<typeof quizPayloadSchema>;

/** Accepts real numbers or digit-only strings (e.g. some clients stringify select values).
 *  Rejects booleans, null, mixed strings like "20x" that z.coerce would silently accept. */
const questionCountField = z
  .union([
    z.number(),
    z.string().regex(/^\d+$/).transform(Number),
  ])
  .refine((n): n is QuestionCount => isQuestionCount(n), {
    message: "questionCount must be 10, 20, 30, 40, or 50",
  });

export const generateQuizBodySchema = z.object({
  title: z.string().max(500).optional().nullable(),
  summaryText: z.string().max(20000).optional().default(""),
  notes: z.string().max(20000).optional().nullable(),
  questionCount: questionCountField,
  /// Bonus: include raw prompt for "copy prompt" debug
  debugIncludePrompt: z.boolean().optional(),
});

export type GenerateQuizBody = z.infer<typeof generateQuizBodySchema>;

export const completeQuizBodySchema = z.object({
  quizRequestId: z.string().min(1),
  /** Optional wall-clock quiz length in seconds (1s–2h). */
  durationSeconds: z.coerce.number().int().min(1).max(7200).optional(),
  answers: z.array(
    z.object({
      quizQuestionId: z.string().min(1),
      // -1 means the question timed out / was skipped.
      selectedIndex: z.number().int().min(-1).max(3),
    }),
  ),
});

export type CompleteQuizBody = z.infer<typeof completeQuizBodySchema>;
