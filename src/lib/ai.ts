import OpenAI from "openai";

export type ChatCompletionArgs = {
  system: string;
  user: string;
  /** Override default model */
  model?: string;
};

/**
 * Thin abstraction so providers/models can be swapped without touching quiz logic.
 */
export interface AIClient {
  completeJson(args: ChatCompletionArgs): Promise<string>;
}

const DEFAULT_MODEL = process.env.OPENAI_QUIZ_MODEL ?? "gpt-4o-mini";

class OpenAIAdapter implements AIClient {
  constructor(
    private readonly client: OpenAI,
    private readonly defaultModel: string = DEFAULT_MODEL,
  ) {}

  async completeJson(args: ChatCompletionArgs): Promise<string> {
    const model = args.model ?? this.defaultModel;
    const res = await this.client.chat.completions.create(
      {
        model,
        temperature: 0.35,
        max_tokens: 16_384,
        response_format: { type: "json_object" },
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
