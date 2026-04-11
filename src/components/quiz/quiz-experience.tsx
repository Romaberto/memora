"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useAnimation, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { GenerationProgress } from "@/components/ui/generation-progress";
import { encouragingMessage, rankFromPercentage } from "@/lib/ranks";
import { describeFallbackReason } from "@/lib/fallback-notice";
import { recordQuizGenerationSeconds } from "@/lib/quiz-generation-timing";
import { isQuestionCount } from "@/lib/schemas/quiz";
import { applyDisplayShuffle } from "@/lib/shuffle-mcq";
import { formatQuizClock } from "@/lib/format-quiz-clock";
import { pointsForStreak } from "@/lib/scoring";

export type QuizQuestionClient = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function streakMilestoneToast(nextStreak: number): string | null {
  if (nextStreak === 3) return "🔥 3 in a row!";
  if (nextStreak === 5) return "⚡ 5 streak — 2× points!";
  if (nextStreak === 10) return "🏆 10 streak — on fire!";
  return null;
}

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
  const reduceMotion = useReducedMotion();

  // ── refs ──────────────────────────────────────────────────────────────────
  const sessionShuffleKeyRef = useRef(0);
  const displayToOriginalRef = useRef<Record<string, number[]>>({});
  const canonicalQuestionsRef = useRef<QuizQuestionClient[]>(initialQuestions);
  const quizClockStartRef = useRef(Date.now());
  const submittingRef = useRef(false);

  function prepareQuestionsFromRaw(raw: QuizQuestionClient[]): QuizQuestionClient[] {
    const k = sessionShuffleKeyRef.current;
    const maps: Record<string, number[]> = {};
    const out = raw.map((qq) => {
      const { display, displayToOriginal } = applyDisplayShuffle(qq, `${qq.id}:${k}`);
      maps[qq.id] = displayToOriginal;
      return display;
    });
    displayToOriginalRef.current = maps;
    return out;
  }

  // ── state ─────────────────────────────────────────────────────────────────
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
  const [elapsedSec, setElapsedSec] = useState(0);

  const [phase, setPhase] = useState<"take" | "results">("take");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  // Entertainment state
  const [lastGain, setLastGain] = useState<number | null>(null);
  const [lastBonus, setLastBonus] = useState<number>(0);
  const [burstCount, setBurstCount] = useState(0); // confetti trigger
  const [streakToast, setStreakToast] = useState<string | null>(null);
  const streakToastTimer = useRef<number | null>(null);

  // Shake animation controls for wrong answers
  const shakeControls = useAnimation();

  const total = questions.length;
  const q = questions[idx];

  // ── timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "take") return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - quizClockStartRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── dot progress state ────────────────────────────────────────────────────
  type DotState = "correct" | "wrong" | "current" | "pending";
  const dotStates: DotState[] = useMemo(() => {
    return questions.map((qq, i) => {
      if (committed[qq.id] !== undefined) {
        return committed[qq.id] === qq.correctIndex ? "correct" : "wrong";
      }
      if (i === idx && locked && picked !== null) {
        return picked === qq.correctIndex ? "correct" : "wrong";
      }
      if (i === idx) return "current";
      return "pending";
    });
  }, [questions, committed, idx, locked, picked]);

  // ── session reset ─────────────────────────────────────────────────────────
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
    setLastBonus(0);
    setBurstCount(0);
    setStreakToast(null);
    submittingRef.current = false;
    quizClockStartRef.current = Date.now();
    setElapsedSec(0);
  }

  // ── answer picking ────────────────────────────────────────────────────────
  function pickOption(i: number) {
    if (locked || phase !== "take" || !q) return;
    setPicked(i);
    setLocked(true);
    const correct = i === q.correctIndex;

    if (correct) {
      const nextStreak = streak + 1;
      const { base, bonus } = pointsForStreak(nextStreak);
      const gain = base + bonus;
      setLastGain(gain);
      setLastBonus(bonus);
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
      setScore((s) => s + gain);
      setBurstCount((c) => c + 1);

      const toast = streakMilestoneToast(nextStreak);
      if (toast) {
        setStreakToast(toast);
        if (streakToastTimer.current != null) clearTimeout(streakToastTimer.current);
        streakToastTimer.current = window.setTimeout(() => setStreakToast(null), 2000);
      }
    } else {
      setStreak(0);
      setLastGain(null);
      setLastBonus(0);
      setWrongIds((w) => (w.includes(q.id) ? w : [...w, q.id]));
      if (!reduceMotion) {
        void shakeControls.start({
          x: [0, -8, 8, -6, 6, -3, 3, 0],
          transition: { duration: 0.42, ease: EASE_OUT },
        });
      }
    }
  }

  // ── submit ────────────────────────────────────────────────────────────────
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

  // ── next ──────────────────────────────────────────────────────────────────
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
    setLastBonus(0);
  }

  // ── keyboard shortcuts (desktop) ──────────────────────────────────────────
  // Use a latest-ref so the listener is only registered once but always
  // reads current state/handlers.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (phase !== "take" || !q) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    if (!locked) {
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= q.options.length) {
        e.preventDefault();
        pickOption(n - 1);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goNext();
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // ── regenerate ────────────────────────────────────────────────────────────
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

  // ── empty state ───────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-6 text-sm text-[rgb(var(--muted))]">
        This quiz has no questions.{" "}
        <Link href="/dashboard" className="font-medium text-accent underline">Back to dashboard</Link>
      </div>
    );
  }

  // ── results ───────────────────────────────────────────────────────────────
  if (phase === "results" && result) {
    const localPct = Math.round(result.percentage);
    const displayRank = result.rankName || rankFromPercentage(localPct);
    const displayMsg = result.message || encouragingMessage(localPct);
    const isWin = localPct >= 80;

    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
      },
    };
    const itemVariants = {
      hidden: { opacity: 0, y: 12 },
      show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
    };

    return (
      <div className="mx-auto max-w-2xl space-y-6 py-4">
        <div className="relative">
          {isWin ? <Confetti trigger={1} variant="celebration" /> : null}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="relative rounded-2xl border border-[rgb(var(--border))] bg-white p-8 text-center shadow-soft"
          >
            <motion.p variants={itemVariants} className="text-sm font-semibold uppercase tracking-wider text-accent">
              Quiz complete
            </motion.p>
            <motion.h1 variants={itemVariants} className="mt-2 text-2xl font-bold">
              {topicState}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 text-6xl font-extrabold tabular-nums text-[rgb(var(--foreground))]"
            >
              {localPct}%
            </motion.p>
            <motion.p variants={itemVariants} className="mt-1 text-sm text-[rgb(var(--muted))]">
              {result.correct}/{total} correct · {result.score} pts
              {result.durationSeconds != null ? ` · ${formatQuizClock(result.durationSeconds)}` : ""}
              {result.streakMax > 1 ? ` · 🔥 ${result.streakMax} streak` : ""}
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-bold text-accent"
            >
              {displayRank}
            </motion.div>

            <motion.p variants={itemVariants} className="mx-auto mt-4 max-w-sm text-sm text-[rgb(var(--muted))]">
              {displayMsg}
            </motion.p>

            {result.sessionId ? (
              <motion.p variants={itemVariants} className="mt-4 text-xs text-[rgb(var(--muted))]">
                <Link href={`/dashboard/session/${result.sessionId}`} className="underline hover:text-accent">
                  Review detailed results
                </Link>
              </motion.p>
            ) : null}
          </motion.div>
        </div>

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
            <Button
              type="button"
              variant="outline"
              disabled={regenLoading}
              onClick={() => {
                const missed = canonicalQuestionsRef.current.filter((qq) => wrongIds.includes(qq.id));
                resetRun(missed, quizRequestId, `${topicState} — missed only`);
              }}
            >
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

  // ── taking the quiz ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4 sm:space-y-5">
      {/* Streak milestone toast */}
      <div className="pointer-events-none fixed left-1/2 top-20 z-30 -translate-x-1/2">
        <AnimatePresence>
          {streakToast && (
            <motion.div
              key={streakToast}
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-bold text-white shadow-lg"
              role="status"
              aria-live="polite"
            >
              {streakToast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {fallbackNotice ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Sample quiz (not from OpenAI)</p>
          <p className="mt-1 opacity-80">{fallbackNotice}</p>
        </div>
      ) : null}

      {/* ── Top bar: topic + stats + streak ── */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3.5 shadow-soft sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[rgb(var(--foreground))] sm:text-base">{topicState}</p>
            <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
              Question {idx + 1} of {total}
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Streak pill */}
            <AnimatePresence>
              {streak >= 2 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-sm ${
                    streak >= 5
                      ? "bg-gradient-to-r from-orange-500 to-rose-500"
                      : "bg-orange-500"
                  }`}
                  aria-label={`${streak} answer streak`}
                >
                  <span aria-hidden>🔥</span>
                  {streak}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center">
              <motion.p
                key={score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="text-lg font-bold tabular-nums leading-none text-accent"
              >
                {score}
              </motion.p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--muted))]">pts</p>
            </div>
            <div className="hidden h-8 w-px bg-[rgb(var(--border))] sm:block" />
            <div className="hidden text-center sm:block">
              <p className="font-mono text-lg font-bold tabular-nums leading-none text-[rgb(var(--foreground))]">
                {formatQuizClock(elapsedSec)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--muted))]">time</p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-3 flex gap-1" role="progressbar" aria-valuenow={idx + (locked ? 1 : 0)} aria-valuemin={0} aria-valuemax={total}>
          {dotStates.map((s, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-[background-color] duration-200 ease-out ${
                s === "correct"
                  ? "bg-emerald-500"
                  : s === "wrong"
                    ? "bg-rose-400"
                    : s === "current"
                      ? "bg-emerald-300"
                      : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Question card ── */}
      {/*
        Confetti lives OUTSIDE AnimatePresence so it isn't re-mounted when the
        question changes — otherwise clicking "Next" would re-trigger the burst
        animation on the new card. The `trigger` key only changes on correct
        answers, so this is the only time particles render.
      */}
      <div className="relative">
        <Confetti trigger={burstCount} variant="mini" />

        <AnimatePresence mode="wait">
          {q ? (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <motion.div animate={shakeControls}>
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-5 shadow-soft sm:p-6">
                <p className="text-base font-semibold leading-relaxed text-[rgb(var(--foreground))] sm:text-lg">
                  {q.question}
                </p>

                {/* Options */}
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2" role="group">
                  {q.options.map((opt, i) => {
                    const isPicked = picked === i;
                    const show = locked;
                    const isCorrect = i === q.correctIndex;
                    let cls =
                      "group relative w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-[border-color,background-color,transform,opacity] duration-150 ease-out ";
                    if (!show) {
                      cls +=
                        "border-[rgb(var(--border))] bg-white hover:border-accent/40 hover:bg-emerald-50/50 active:scale-[0.97]";
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
                        {/* Keyboard hint — desktop only */}
                        <span className="absolute right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded border border-[rgb(var(--border))] text-[10px] font-bold text-[rgb(var(--muted))] md:group-hover:flex">
                          {i + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation + scoring feedback */}
                {locked && picked !== null ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="mt-5 rounded-xl bg-[rgb(var(--background))] p-4 text-sm"
                  >
                    {/* Row 1: correct/incorrect + points + optional bonus */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          picked === q.correctIndex ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {picked === q.correctIndex ? "Correct!" : "Incorrect"}
                      </span>
                      {lastGain !== null ? (
                        <motion.span
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 260, damping: 18 }}
                          className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                        >
                          +{lastGain} pts
                        </motion.span>
                      ) : null}
                      {lastBonus > 0 ? (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0, y: -4 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 18,
                            delay: 0.08,
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm"
                        >
                          <span aria-hidden>🔥</span>
                          {streak >= 5 ? `2× multiplier` : `+${lastBonus} streak bonus`}
                        </motion.span>
                      ) : null}
                    </div>

                    {/* Row 2: progress toward next streak reward (correct answers only) */}
                    {picked === q.correctIndex ? (
                      streak >= 5 ? (
                        <p className="mt-1.5 text-[11px] font-semibold text-orange-600">
                          🔥 2× multiplier active — don&apos;t break the chain!
                        </p>
                      ) : streak >= 3 ? (
                        <p className="mt-1.5 text-[11px] font-medium text-orange-600">
                          🔥 Streak bonus active. {5 - streak} more in a row → <span className="font-bold">2× multiplier</span>
                        </p>
                      ) : streak >= 1 ? (
                        <p className="mt-1.5 text-[11px] font-medium text-orange-600">
                          🔥 {3 - streak} more correct in a row → <span className="font-bold">+5 streak bonus</span>
                        </p>
                      ) : null
                    ) : (
                      streak === 0 && maxStreak >= 3 ? (
                        <p className="mt-1.5 text-[11px] font-medium text-rose-600">
                          Streak broken. Get 3 in a row to restart the bonus.
                        </p>
                      ) : null
                    )}

                    <p className="mt-2 leading-relaxed text-[rgb(var(--muted))]">{q.explanation}</p>
                  </motion.div>
                ) : null}

                {/* Next button */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="hidden text-[11px] text-[rgb(var(--muted))] md:block">
                    {locked ? (
                      <>
                        Press <kbd className="rounded border border-[rgb(var(--border))] bg-white px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to continue
                      </>
                    ) : (
                      <>
                        Press <kbd className="rounded border border-[rgb(var(--border))] bg-white px-1.5 py-0.5 font-mono text-[10px]">1</kbd>–<kbd className="rounded border border-[rgb(var(--border))] bg-white px-1.5 py-0.5 font-mono text-[10px]">{q.options.length}</kbd> to answer
                      </>
                    )}
                  </p>
                  <Button
                    type="button"
                    disabled={!locked || picked === null || saving}
                    onClick={goNext}
                    className="ml-auto"
                  >
                    {idx + 1 >= total ? (saving ? "Saving..." : "See results") : "Next →"}
                  </Button>
                </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

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
