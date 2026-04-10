"use client";

/**
 * Hero quiz demo
 *
 * A miniature, real-looking quiz card that cycles through 3 questions:
 *  1. Question types in (char-by-char, ~28ms/char)
 *  2. Four options stagger-fade in
 *  3. After a beat, the correct option highlights green ✓
 *  4. The score pill ticks +10 with a spring bounce
 *  5. Long pause, then advance to next question
 *
 * After question 3 the loop resets to question 1 with score 0.
 * Honors prefers-reduced-motion (renders the final frame of question 1, no loop).
 */

import { useEffect, useReducer } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Question = {
  topic: string;
  question: string;
  options: readonly string[];
  correctIndex: number;
};

const QUESTIONS: readonly Question[] = [
  {
    topic: "Cognitive science",
    question: "What does retrieval practice strengthen?",
    options: [
      "Recognition of familiar passages",
      "Long-term memory pathways",
      "Reading speed",
      "Vocabulary breadth",
    ],
    correctIndex: 1,
  },
  {
    topic: "Roman history",
    question: "Which year did Rome become an empire?",
    options: [
      "27 BC, under Augustus",
      "509 BC, founding of the Republic",
      "44 BC, death of Caesar",
      "476 AD, fall of the West",
    ],
    correctIndex: 0,
  },
  {
    topic: "TypeScript",
    question: "What does the `satisfies` operator do?",
    options: [
      "Casts a value to any type",
      "Validates a value against a type without widening",
      "Marks a property as optional",
      "Asserts a value is non-null",
    ],
    correctIndex: 1,
  },
] as const;

type Phase = "typing" | "options" | "reveal" | "scored" | "pause";

type State = {
  questionIndex: number;
  phase: Phase;
  charsTyped: number;
  optionsShown: number;
  score: number;
};

type Action =
  | { type: "tick-char" }
  | { type: "show-option" }
  | { type: "reveal" }
  | { type: "score" }
  | { type: "pause" }
  | { type: "next-question" }
  | { type: "skip-to-end" };

const INITIAL: State = {
  questionIndex: 0,
  phase: "typing",
  charsTyped: 0,
  optionsShown: 0,
  score: 0,
};

function reducer(state: State, action: Action): State {
  const q = QUESTIONS[state.questionIndex]!;
  switch (action.type) {
    case "tick-char":
      if (state.charsTyped >= q.question.length) {
        return { ...state, phase: "options" };
      }
      return { ...state, charsTyped: state.charsTyped + 1 };
    case "show-option":
      if (state.optionsShown >= q.options.length) return state;
      return { ...state, optionsShown: state.optionsShown + 1 };
    case "reveal":
      return { ...state, phase: "reveal" };
    case "score":
      return { ...state, phase: "scored", score: state.score + 10 };
    case "pause":
      return { ...state, phase: "pause" };
    case "next-question": {
      const isLast = state.questionIndex >= QUESTIONS.length - 1;
      return {
        questionIndex: isLast ? 0 : state.questionIndex + 1,
        phase: "typing",
        charsTyped: 0,
        optionsShown: 0,
        score: isLast ? 0 : state.score,
      };
    }
    case "skip-to-end":
      return {
        questionIndex: 0,
        phase: "scored",
        charsTyped: q.question.length,
        optionsShown: q.options.length,
        score: 10,
      };
    default:
      return state;
  }
}

export function HeroQuizDemo() {
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Schedule the timeline for the *current* question.
  // Re-runs whenever questionIndex changes (i.e., after `next-question`).
  useEffect(() => {
    if (reduceMotion) {
      dispatch({ type: "skip-to-end" });
      return;
    }

    const q = QUESTIONS[state.questionIndex]!;
    const timers: number[] = [];

    // Phase 1: typewriter
    const charDelay = 28;
    const startDelay = state.questionIndex === 0 ? 350 : 200;
    for (let i = 0; i <= q.question.length; i++) {
      timers.push(
        window.setTimeout(
          () => dispatch({ type: "tick-char" }),
          startDelay + i * charDelay,
        ),
      );
    }

    // Phase 2: stagger options in
    const optionsStart = startDelay + (q.question.length + 1) * charDelay + 140;
    for (let i = 0; i < q.options.length; i++) {
      timers.push(
        window.setTimeout(
          () => dispatch({ type: "show-option" }),
          optionsStart + i * 110,
        ),
      );
    }

    // Phase 3: reveal correct
    const revealAt = optionsStart + q.options.length * 110 + 700;
    timers.push(window.setTimeout(() => dispatch({ type: "reveal" }), revealAt));

    // Phase 4: score
    const scoreAt = revealAt + 220;
    timers.push(window.setTimeout(() => dispatch({ type: "score" }), scoreAt));

    // Phase 5: hold, then advance to next question
    timers.push(window.setTimeout(() => dispatch({ type: "pause" }), scoreAt + 400));
    timers.push(
      window.setTimeout(() => dispatch({ type: "next-question" }), scoreAt + 2400),
    );

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [reduceMotion, state.questionIndex]);

  const q = QUESTIONS[state.questionIndex]!;
  const showCaret = state.phase === "typing";
  const typed = q.question.slice(0, state.charsTyped);

  return (
    <div className="relative">
      {/* soft glow behind card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-emerald-200/40 via-emerald-100/30 to-teal-200/30 blur-2xl sm:-inset-6 sm:rounded-[2.5rem]"
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
        className="relative w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.25)] sm:rounded-3xl sm:p-7"
        role="figure"
        aria-label="Example quiz card"
      >
        {/* Card top bar */}
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Q{state.questionIndex + 1} / {QUESTIONS.length}
            </span>
            <motion.span
              key={`topic-${state.questionIndex}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="truncate text-[11px] font-medium text-[rgb(var(--muted))]"
            >
              {q.topic}
            </motion.span>
          </div>
          <motion.div
            key={`score-${state.score}`}
            initial={state.score > 0 ? { scale: 0.7, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold tabular-nums ${
              state.score > 0
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {state.score} pts
          </motion.div>
        </div>

        {/* Question */}
        <p className="min-h-[3rem] text-base font-semibold leading-snug text-[rgb(var(--foreground))] sm:min-h-[3.5rem] sm:text-lg">
          {typed}
          {showCaret && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-4 w-[2px] -translate-y-0.5 animate-pulse bg-emerald-500 align-middle sm:h-5"
            />
          )}
        </p>

        {/* Options */}
        <ul className="mt-4 space-y-1.5 sm:mt-5 sm:space-y-2">
          {q.options.map((opt, i) => {
            const visible = i < state.optionsShown;
            const isCorrect = i === q.correctIndex;
            const showCorrect =
              (state.phase === "reveal" ||
                state.phase === "scored" ||
                state.phase === "pause") &&
              isCorrect;

            return (
              <motion.li
                key={`${state.questionIndex}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: visible ? 1 : 0,
                  y: visible ? 0 : 8,
                }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] leading-snug transition-[border-color,background-color] duration-200 ease-out sm:gap-3 sm:rounded-xl sm:px-3.5 sm:py-2.5 sm:text-sm ${
                  showCorrect
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-200 ease-out ${
                    showCorrect
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  {showCorrect ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="leading-snug">{opt}</span>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}
