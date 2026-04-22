import type { FallbackReason } from "./quiz-generator";

/** User-facing copy when the sample quiz was used instead of the model. */
export function describeFallbackReason(reason?: string): string {
  const r = reason as FallbackReason | undefined;
  switch (r) {
    case "no_api_key":
      return "No OpenAI API key was configured (OPENAI_API_KEY). Add it to memorize/.env and restart the dev server.";
    case "openai_error":
      return "The OpenAI request failed (network, billing, or model error). Check the terminal for [quiz-generator] logs and your API key / plan.";
    case "invalid_json":
      return "The model did not return valid JSON. Try again or switch OPENAI_QUIZ_MODEL.";
    case "schema_invalid":
      return "The model JSON did not match the expected quiz shape. Try generating again.";
    case "wrong_question_count":
      return "The model returned the wrong number of questions. Try again or a different model.";
    case "duplicate_options":
      return "A question had duplicate answer options. Try generating again.";
    case "repetitive_questions":
      return "The model repeated too many question ideas. Try generating again with a narrower source or a smaller quiz size.";
    default:
      return "A built-in sample quiz was used instead of AI. Set OPENAI_API_KEY in memorize/.env, restart npm run dev, and generate again.";
  }
}
