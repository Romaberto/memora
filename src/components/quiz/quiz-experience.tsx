"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GenerationProgress } from "@/components/ui/generation-progress";
import { encouragingMessage, rankFromPercentage } from "@/lib/ranks";
import { describeFallbackReason } from "@/lib/fallback-notice";
import { recordQuizGenerationSeconds } from "@/lib/quiz-generation-timing";
import { isQuestionCount } from "@/lib/schemas/quiz";
import { applyDisplayShuffle } from "@/lib/shuffle-mcq";
import { formatQuizClock } from "@/lib/format-quiz-clock";
import { ROUND_LABELS, questionRoundPhase } from "@/lib/quiz-rounds";

export type QuizQuestionClient = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const POINTS = 10;

type Props = {
  initialQuizRequestId: string;
  topic: string;
  questions: QuizQuestionClient[];
  /** Shown when this quiz was generated with the built-in sample instead of OpenAI */
  initialFallbackNotice?: string | null;
};

type ResultPayload = {
  sessionId: string;
  score: number;
  correct: number;
  total: number;
  percentage: number;
  rankName: string;
  message: string;
  streakMax: number;
  durationSeconds?: number | null;
};

export function QuizExperience({
  initialQuizRequestId,
  topic,
  questions: initialQuestions,
  initialFallbackNotice = null,
}: Props) {
  const sessionShuffleKeyRef = useRef(0);
  const displayToOriginalRef = useRef<Record<string, number[]>>({});
  const canonicalQuestionsRef = useRef<QuizQuestionClient[]>(initialQuestions);
  const quizClockStartRef = useRef(Date.now());
  const submittingRef = useRef(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  function prepareQuestionsFromRaw(raw: QuizQuestionClient[]): QuizQuestionClient[] {
    const k = sessionShuffleKeyRef.current;
    const maps: Record<string, number[]> = {};
    const out = raw.map((q) => {
      const { display, displayToOriginal } = applyDisplayShuffle(
        q,
        `${q.id}:${k}`,
      );
      maps[q.id] = displayToOriginal;
      return display;
    });
    displayToOriginalRef.current = maps;
    return out;
  }

  const [fallbackNotice, setFallbackNotice] = useState<string | null>(
    initialFallbackNotice,
  );
  const [quizRequestId, setQuizRequestId] = useState(initialQuizRequestId);
  const [questions, setQuestions] = useState(() =>
    prepareQuestionsFromRaw(initialQuestions),
  );
  const [topicState, setTopicState] = useState(topic);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [committed, setCommitted] = useState<Record<string, number>>({});

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const [phase, setPhase] = useState<"take" | "results">("take");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [lastGain, setLastGain] = useState<number | null>(null);

  const total = questions.length;
  const q = questions[idx];

  useEffect(() => {
    if (phase !== "take") return;
    const id = window.setInterval(() => {
      setElapsedSec(
        Math.floor((Date.now() - quizClockStartRef.current) / 1000),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const roundPhase = q && total > 0 ? questionRoundPhase(idx, total) : 0;
  const roundMeta = ROUND_LABELS[roundPhase]!;
  const isBossRound = roundPhase === 3;

  const progressPct = useMemo(() => {
    if (total === 0) return 0;
    return Math.min(100, Math.round(((idx + (locked ? 1 : 0)) / total) * 100));
  }, [idx, locked, total]);

  function resetRun(
    nextQuestions: QuizQuestionClient[],
    nextId: string,
    nextTopic: string,
  ) {
    sessionShuffleKeyRef.current += 1;
    canonicalQuestionsRef.current = nextQuestions;
    setQuizRequestId(nextId);
    setQuestions(prepareQuestionsFromRaw(nextQuestions));
    setTopicState(nextTopic);
    setIdx(0);
    setPicked(null);
    setLocked(false);
    setCommitted({});
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setWrongIds([]);
    setPhase("take");
    setSaving(false);
    setSaveError(null);
    setResult(null);
    setLastGain(null);
    submittingRef.current = false;
    quizClockStartRef.current = Date.now();
    setElapsedSec(0);
  }

  function pickOption(i: number) {
    if (locked || phase !== "take" || !q) return;
    setPicked(i);
    setLocked(true);
    const correct = i === q.correctIndex;
    if (correct) {
      const nextStreak = streak + 1;
      const gain = POINTS;
      setLastGain(gain);
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
      setScore((s) => s + gain);
    } else {
      setStreak(0);
      setLastGain(null);
      setWrongIds((w) => (w.includes(q.id) ? w : [...w, q.id]));
    }
  }

  async function submitAnswers(full: Record<string, number>) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const durationSeconds = Math.max(
        1,
        Math.floor((Date.now() - quizClockStartRef.current) / 1000),
      );
      const map = displayToOriginalRef.current;
      const res = await fetch("/api/quiz/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizRequestId,
          durationSeconds,
          answers: questions.map((qq) => {
            const displayIdx = full[qq.id]!;
            const perm = map[qq.id];
            const storedIdx =
              perm && perm.length > 0 ? perm[displayIdx]! : displayIdx;
            return {
              quizQuestionId: qq.id,
              selectedIndex: storedIdx,
            };
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string"
            ? data.error
            : "Could not save your results. Please try again.",
        );
        return;
      }
      setResult(data as ResultPayload);
      setPhase("results");
    } catch {
      setSaveError("Network error. Check your connection and retry.");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  function goNext() {
    if (!q || picked === null || !locked) return;
    const nextCommitted = { ...committed, [q.id]: picked };
    setCommitted(nextCommitted);
    const nextIdx = idx + 1;
    if (nextIdx >= total) {
      void submitAnswers(nextCommitted);
      return;
    }
    setIdx(nextIdx);
    setPicked(null);
    setLocked(false);
    setLastGain(null);
  }

  async function handleRegenerate() {
    setRegenLoading(true);
    setSaveError(null);
    const startMs =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const res = await fetch("/api/regenerate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromQuizRequestId: quizRequestId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" ? data.error : "Regeneration failed.",
        );
        return;
      }
      const qs = (data.questions as QuizQuestionClient[]) ?? [];
      const endMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsedSec =
        typeof performance !== "undefined"
          ? (endMs - startMs) / 1000
          : (endMs - startMs) / 1000;
      if (isQuestionCount(total)) {
        recordQuizGenerationSeconds(total, elapsedSec);
      }

      if (data.usedFallback) {
        setFallbackNotice(
          describeFallbackReason(
            typeof data.fallbackReason === "string"
              ? data.fallbackReason
              : undefined,
          ),
        );
      } else {
        setFallbackNotice(null);
      }
      resetRun(qs, data.quizRequestId as string, (data.topic as string) ?? topicState);
    } catch {
      setSaveError("Network error while regenerating.");
    } finally {
      setRegenLoading(false);
    }
  }

  if (total === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This quiz has no questions.{" "}
          <Link href="/dashboard" className="font-medium text-accent underline">
            Back to dashboard
          </Link>
        </p>
      </Card>
    );
  }

  if (phase === "results" && result) {
    const localPct = Math.round(result.percentage);
    const displayRank = result.rankName || rankFromPercentage(localPct);
    const displayMsg = result.message || encouragingMessage(localPct);

    return (
      <div className="space-y-8">
        <Card className="relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-sm font-medium uppercase tracking-wide text-accent">
              Quiz complete
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {topicState}
            </h1>
            <p className="mt-4 text-5xl font-bold tabular-nums">{localPct}%</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {result.correct} / {total} correct · Score {result.score} pts
              {result.durationSeconds != null
                ? ` · Time ${formatQuizClock(result.durationSeconds)}`
                : ""}
              {result.streakMax > 1
                ? ` · Best streak ${result.streakMax}`
                : ""}
            </p>
            <p className="mt-2 text-lg font-semibold">{displayRank}</p>
            <p className="mx-auto mt-4 max-w-md text-sm text-slate-600 dark:text-slate-300">
              {displayMsg}
            </p>
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <p className="font-semibold text-slate-900 dark:text-white">
                Performance summary
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-300">
                <li>
                  Accuracy {localPct}% across {total} questions
                </li>
                <li>10 points per correct answer (no extra streak points).</li>
                {result.streakMax > 1 ? (
                  <li>Best answer streak this run: {result.streakMax}</li>
                ) : null}
                <li>Tier: {displayRank}</li>
              </ul>
            </div>
            {result.sessionId ? (
              <p className="mt-4 text-xs text-slate-400">
                <Link
                  href={`/dashboard/session/${result.sessionId}`}
                  className="underline hover:text-accent"
                >
                  Review detailed results
                </Link>
              </p>
            ) : null}
          </motion.div>
        </Card>

        {regenLoading ? (
          <GenerationProgress
            message="Generating new questions…"
            questionCount={
              isQuestionCount(total) ? total : undefined
            }
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40"
          />
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            disabled={regenLoading}
            onClick={() =>
              resetRun(
                canonicalQuestionsRef.current,
                quizRequestId,
                topicState,
              )
            }
          >
            Retry same quiz
          </Button>
          {wrongIds.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={regenLoading}
              onClick={() => {
                const missed = canonicalQuestionsRef.current.filter((qq) =>
                  wrongIds.includes(qq.id),
                );
                resetRun(missed, quizRequestId, `${topicState} — missed only`);
              }}
            >
              Review missed ({wrongIds.length})
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={regenLoading}
            onClick={() => void handleRegenerate()}
          >
            {regenLoading ? "Regenerating…" : "New questions, same topic"}
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="ghost" disabled={regenLoading}>
              Generate a new quiz
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {fallbackNotice ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="font-semibold">Sample quiz (not from OpenAI)</p>
          <p className="mt-1 opacity-90">{fallbackNotice}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">Topic</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {topicState}
          </h1>
        </div>
        <div className="flex flex-wrap gap-8 sm:gap-10">
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">Score</p>
            <motion.p
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold tabular-nums text-accent"
            >
              {score}
            </motion.p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">Time</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-slate-200">
              {formatQuizClock(elapsedSec)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>
            Question {idx + 1} / {total}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {q ? (
        <div
          className={`rounded-2xl border px-4 py-3 sm:px-5 ${
            isBossRound
              ? "border-violet-500/55 bg-gradient-to-r from-violet-600/20 via-violet-500/10 to-transparent dark:border-violet-400/45"
              : "border-slate-200/90 bg-slate-100/60 dark:border-slate-600 dark:bg-slate-800/50"
          }`}
        >
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {roundMeta.title}
              {isBossRound ? " 👾" : ""}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {roundMeta.subtitle}
            </p>
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {q ? (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <Card
              className={
                isBossRound
                  ? "ring-2 ring-violet-500/45 dark:ring-violet-400/35"
                  : undefined
              }
            >
              <p className="text-base font-medium leading-relaxed sm:text-lg">
                {q.question}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2" role="group">
                {q.options.map((opt, i) => {
                  const isPicked = picked === i;
                  const show = locked;
                  const isCorrect = i === q.correctIndex;
                  let cls =
                    "w-full rounded-2xl border px-4 py-4 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ";
                  if (!show) {
                    cls +=
                      " border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800";
                  } else if (isCorrect) {
                    cls += " border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
                  } else if (isPicked) {
                    cls += " border-rose-500 bg-rose-50 dark:bg-rose-950/40";
                  } else {
                    cls += " border-slate-200 opacity-60 dark:border-slate-700";
                  }
                  return (
                    <motion.button
                      type="button"
                      key={i}
                      whileTap={locked ? undefined : { scale: 0.98 }}
                      disabled={locked}
                      onClick={() => pickOption(i)}
                      className={cls}
                      aria-pressed={isPicked}
                    >
                      <span className="mr-2 font-mono text-xs text-slate-400">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>

              {locked && picked !== null ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {picked === q.correctIndex ? "Correct" : "Not quite"}
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {q.explanation}
                  </p>
                  {picked === q.correctIndex && lastGain !== null ? (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none mt-3 flex justify-center"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
                      transition={{ duration: 0.45 }}
                    >
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        +{lastGain} pts
                      </span>
                    </motion.div>
                  ) : picked !== q.correctIndex ? (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none mt-3 flex justify-center"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/80 dark:text-slate-300">
                        0 pts
                      </span>
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : null}

              <div className="mt-8 flex justify-end gap-3">
                <Button
                  type="button"
                  disabled={!locked || picked === null || saving}
                  onClick={goNext}
                >
                  {idx + 1 >= total ? (saving ? "Saving…" : "See results") : "Next question"}
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {saveError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {saveError}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setSaveError(null);
              if (q && picked !== null) {
                void submitAnswers({ ...committed, [q.id]: picked });
              }
            }}
          >
            Retry save
          </button>
        </div>
      ) : null}
    </div>
  );
}
