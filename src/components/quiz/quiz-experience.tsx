"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GenerationProgress } from "@/components/ui/generation-progress";
import { encouragingMessage, rankFromPercentage } from "@/lib/ranks";
import { describeFallbackReason } from "@/lib/fallback-notice";
import { recordQuizGenerationSeconds } from "@/lib/quiz-generation-timing";
import { isQuestionCount } from "@/lib/schemas/quiz";
import { applyDisplayShuffle } from "@/lib/shuffle-mcq";
import { formatQuizClock } from "@/lib/format-quiz-clock";

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
      const { display, displayToOriginal } = applyDisplayShuffle(q, `${q.id}:${k}`);
      maps[q.id] = displayToOriginal;
      return display;
    });
    displayToOriginalRef.current = maps;
    return out;
  }

  const [fallbackNotice, setFallbackNotice] = useState<string | null>(initialFallbackNotice);
  const [quizRequestId, setQuizRequestId] = useState(initialQuizRequestId);
  const [questions, setQuestions] = useState(() => prepareQuestionsFromRaw(initialQuestions));
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
      setElapsedSec(Math.floor((Date.now() - quizClockStartRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const progressPct = useMemo(() => {
    if (total === 0) return 0;
    return Math.min(100, Math.round(((idx + (locked ? 1 : 0)) / total) * 100));
  }, [idx, locked, total]);

  function resetRun(nextQuestions: QuizQuestionClient[], nextId: string, nextTopic: string) {
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
      setLastGain(POINTS);
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
      setScore((s) => s + POINTS);
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
      const durationSeconds = Math.max(1, Math.floor((Date.now() - quizClockStartRef.current) / 1000));
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
            const storedIdx = perm && perm.length > 0 ? perm[displayIdx]! : displayIdx;
            return { quizQuestionId: qq.id, selectedIndex: storedIdx };
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not save your results.");
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
    const startMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const res = await fetch("/api/regenerate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromQuizRequestId: quizRequestId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Regeneration failed.");
        return;
      }
      const qs = (data.questions as QuizQuestionClient[]) ?? [];
      const endMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = (endMs - startMs) / 1000;
      if (isQuestionCount(total)) recordQuizGenerationSeconds(total, elapsed);

      if (data.usedFallback) {
        setFallbackNotice(describeFallbackReason(typeof data.fallbackReason === "string" ? data.fallbackReason : undefined));
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

  // ─── Empty state ───
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-6 text-sm text-[rgb(var(--muted))]">
        This quiz has no questions.{" "}
        <Link href="/dashboard" className="font-medium text-accent underline">Back to dashboard</Link>
      </div>
    );
  }

  // ─── Results ───
  if (phase === "results" && result) {
    const localPct = Math.round(result.percentage);
    const displayRank = result.rankName || rankFromPercentage(localPct);
    const displayMsg = result.message || encouragingMessage(localPct);

    return (
      <div className="mx-auto max-w-2xl space-y-6 py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-[rgb(var(--border))] bg-white p-8 text-center shadow-soft"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Quiz complete</p>
          <h1 className="mt-2 text-2xl font-bold">{topicState}</h1>

          <p className="mt-6 text-6xl font-extrabold tabular-nums text-[rgb(var(--foreground))]">{localPct}%</p>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            {result.correct}/{total} correct · {result.score} pts
            {result.durationSeconds != null ? ` · ${formatQuizClock(result.durationSeconds)}` : ""}
            {result.streakMax > 1 ? ` · ${result.streakMax} streak` : ""}
          </p>

          <div className="mt-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-bold text-accent">
            {displayRank}
          </div>

          <p className="mx-auto mt-4 max-w-sm text-sm text-[rgb(var(--muted))]">{displayMsg}</p>

          {result.sessionId ? (
            <p className="mt-4 text-xs text-[rgb(var(--muted))]">
              <Link href={`/dashboard/session/${result.sessionId}`} className="underline hover:text-accent">
                Review detailed results
              </Link>
            </p>
          ) : null}
        </motion.div>

        {regenLoading ? (
          <GenerationProgress
            message="Generating new questions..."
            questionCount={isQuestionCount(total) ? total : undefined}
            className="rounded-xl border border-[rgb(var(--border))] bg-white p-4"
          />
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" disabled={regenLoading} onClick={() => resetRun(canonicalQuestionsRef.current, quizRequestId, topicState)}>
            Retry same quiz
          </Button>
          {wrongIds.length > 0 ? (
            <Button type="button" variant="outline" disabled={regenLoading} onClick={() => {
              const missed = canonicalQuestionsRef.current.filter((qq) => wrongIds.includes(qq.id));
              resetRun(missed, quizRequestId, `${topicState} — missed only`);
            }}>
              Review missed ({wrongIds.length})
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={regenLoading} onClick={() => void handleRegenerate()}>
            {regenLoading ? "Regenerating..." : "New questions"}
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="ghost" disabled={regenLoading}>New quiz</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Quiz taking ───
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-4">
      {fallbackNotice ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Sample quiz (not from OpenAI)</p>
          <p className="mt-1 opacity-80">{fallbackNotice}</p>
        </div>
      ) : null}

      {/* ── Top bar: topic + stats ── */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-5 py-4 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[rgb(var(--foreground))]">{topicState}</p>
            <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
              Question {idx + 1} of {total}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <motion.p key={score} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="text-lg font-bold tabular-nums text-accent">
                {score}
              </motion.p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--muted))]">pts</p>
            </div>
            <div className="h-8 w-px bg-[rgb(var(--border))]" />
            <div className="text-center">
              <p className="font-mono text-lg font-bold tabular-nums text-[rgb(var(--foreground))]">
                {formatQuizClock(elapsedSec)}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--muted))]">time</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* ── Question card ── */}
      <AnimatePresence mode="wait">
        {q ? (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-5 shadow-soft sm:p-6">
              <p className="text-lg font-semibold leading-relaxed text-[rgb(var(--foreground))]">
                {q.question}
              </p>

              {/* Options */}
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2" role="group">
                {q.options.map((opt, i) => {
                  const isPicked = picked === i;
                  const show = locked;
                  const isCorrect = i === q.correctIndex;
                  let cls =
                    "w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all ";
                  if (!show) {
                    cls += "border-[rgb(var(--border))] bg-white hover:border-accent/40 hover:bg-emerald-50/50 active:scale-[0.98]";
                  } else if (isCorrect) {
                    cls += "border-emerald-400 bg-emerald-50 text-emerald-900";
                  } else if (isPicked) {
                    cls += "border-rose-400 bg-rose-50 text-rose-900";
                  } else {
                    cls += "border-[rgb(var(--border))] opacity-50";
                  }
                  return (
                    <button
                      type="button"
                      key={i}
                      disabled={locked}
                      onClick={() => pickOption(i)}
                      className={cls}
                      aria-pressed={isPicked}
                    >
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[rgb(var(--background))] text-xs font-bold text-[rgb(var(--muted))]">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {locked && picked !== null ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-xl bg-[rgb(var(--background))] p-4 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${picked === q.correctIndex ? "text-emerald-600" : "text-rose-600"}`}>
                      {picked === q.correctIndex ? "Correct!" : "Incorrect"}
                    </span>
                    {lastGain !== null ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">+{lastGain} pts</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-[rgb(var(--muted))]">{q.explanation}</p>
                </motion.div>
              ) : null}

              {/* Next button */}
              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  disabled={!locked || picked === null || saving}
                  onClick={goNext}
                >
                  {idx + 1 >= total ? (saving ? "Saving..." : "See results") : "Next →"}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {saveError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {saveError}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setSaveError(null);
              if (q && picked !== null) void submitAnswers({ ...committed, [q.id]: picked });
            }}
          >
            Retry save
          </button>
        </div>
      ) : null}
    </div>
  );
}
