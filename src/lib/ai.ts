import OpenAI from "openai";

/**
 * Optional JSON Schema (OpenAI strict mode). When provided, the model is
 * GUARANTEED to return JSON matching this schema — no parse errors, no
 * shape errors. We use this for quiz generation to eliminate retry loops.
 *
 * Note: OpenAI strict mode does NOT support `minItems`/`maxItems`/`minLength`,
 * so array length still has to be enforced via the prompt + light validation
 * downstream.
 */
export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ChatCompletionArgs = {
  system: string;
  user: string;
  /** Override default model */
  model?: string;
  /** When set, request strict JSON-schema response_format. */
  jsonSchema?: JsonSchema;
  /** Override default max_tokens (default: 4000). */
  maxTokens?: number;
};

/**
 * Thin abstraction so providers/models can be swapped without touching quiz logic.
 */
export interface AIClient {
  completeJson(args: ChatCompletionArgs): Promise<string>;
}

// gpt-4.1-mini is ~1.5–2× faster than gpt-4o-mini at similar quality.
// Override via OPENAI_QUIZ_MODEL env var (e.g. "gpt-4.1-nano" for max speed,
// "gpt-4o-mini" to roll back).
const DEFAULT_MODEL = process.env.OPENAI_QUIZ_MODEL ?? "gpt-4.1-mini";

class OpenAIAdapter implements AIClient {
  constructor(
    private readonly client: OpenAI,
    private readonly defaultModel: string = DEFAULT_MODEL,
  ) {}

  async completeJson(args: ChatCompletionArgs): Promise<string> {
    const model = args.model ?? this.defaultModel;

    const maxTokens = args.maxTokens ?? 4_000;
    const responseFormat = args.jsonSchema
      ? ({
          type: "json_schema" as const,
          json_schema: {
            name: args.jsonSchema.name,
            strict: args.jsonSchema.strict ?? true,
            schema: args.jsonSchema.schema,
          },
        })
      : ({ type: "json_object" as const });

    const res = await this.client.chat.completions.create(
      {
        model,
        temperature: 0.35,
        max_tokens: maxTokens,
        response_format: responseFormat,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      },
      { timeout: 120_000 }, // 2-minute hard limit per call
    );
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from model");
    return text;
  }
}

export function createAIClient(): AIClient | null {
  const raw = process.env.OPENAI_API_KEY?.trim();
  if (!raw) return null;
  const key = raw.replace(/^["']|["']$/g, "");
  if (!key) return null;
  const client = new OpenAI({ apiKey: key });
  return new OpenAIAdapter(client);
}
