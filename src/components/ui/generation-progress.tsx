"use client";

import { useEffect, useState } from "react";
import type { QuestionCount } from "@/lib/schemas/quiz";
import {
  fullQuizGenerationHint,
  typicalQuizGenerationHint,
} from "@/lib/quiz-generation-timing";

const FALLBACK_HINT =
  "This usually takes about 20–90 seconds depending on length and the model.";

type Props = {
  message?: string;
  /** When provided and non-empty, replaces the dynamic time estimate. */
  hint?: string | null;
  /** Drives typical + learned wait time (from your recent runs on this device). */
  questionCount?: QuestionCount;
  className?: string;
};

export function GenerationProgress({
  message = "Generating your quiz…",
  hint: hintProp,
  questionCount,
  className = "",
}: Props) {
  const useDynamic = hintProp == null || hintProp === "";

  const [dynamicHint, setDynamicHint] = useState(() => {
    if (!useDynamic) return "";
    if (questionCount != null) return typicalQuizGenerationHint(questionCount);
    return FALLBACK_HINT;
  });

  useEffect(() => {
    if (hintProp != null && hintProp !== "") return;
    if (questionCount != null) {
      setDynamicHint(fullQuizGenerationHint(questionCount));
    } else {
      setDynamicHint(FALLBACK_HINT);
    }
  }, [questionCount, hintProp]);

  const hint = useDynamic ? dynamicHint : hintProp;

  return (
    <div
      className={`space-y-2 ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {message}
      </p>
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuetext={message}
      >
        <div
          className="absolute inset-y-0 w-[38%] rounded-full bg-accent shadow-sm motion-reduce:left-[31%] motion-reduce:animate-none animate-generation-indeterminate"
          aria-hidden
        />
      </div>
      {hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
