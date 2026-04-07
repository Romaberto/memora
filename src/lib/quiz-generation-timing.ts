import { isQuestionCount, type QuestionCount } from "@/lib/schemas/quiz";

const STORAGE_KEY = "memorize.quizGenDurations.v1";
const MAX_SAMPLES = 12;

/** Heuristic wall-clock ranges (seconds) for OpenAI quiz generation by size. */
export const TYPICAL_QUIZ_GEN_RANGE_SEC: Record<
  QuestionCount,
  { min: number; max: number }
> = {
  10: { min: 15, max: 45 },
  20: { min: 25, max: 90 },
  30: { min: 35, max: 120 },
  40: { min: 45, max: 160 },
  50: { min: 55, max: 200 },
};

type DurationStore = Partial<Record<number, number[]>>;

function readStore(): DurationStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as DurationStore;
  } catch {
    /* ignore */
  }
  return {};
}

function writeStore(store: DurationStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[quiz-generation-timing] localStorage write failed (quota exceeded?):", err);
    }
  }
}

/**
 * Call after a successful generate/regenerate; refines future wait hints for this device.
 */
export function recordQuizGenerationSeconds(
  questionCount: number,
  seconds: number,
): void {
  if (!isQuestionCount(questionCount)) return;
  if (!Number.isFinite(seconds) || seconds < 0.3 || seconds > 900) return;

  const store = readStore();
  const prev = store[questionCount] ?? [];
  const next = [...prev, seconds].slice(-MAX_SAMPLES);
  store[questionCount] = next;
  writeStore(store);
}

export function formatDurationRangeSec(low: number, high: number): string {
  const lo = Math.max(1, Math.round(low));
  const hi = Math.max(lo, Math.round(high));
  if (hi <= 90) return `${lo}–${hi} seconds`;

  const part = (sec: number) => {
    if (sec < 60) return `${sec} sec`;
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    if (r === 0) return `${m} min`;
    return `${m} min ${r} sec`;
  };
  return `${part(lo)}–${part(hi)}`;
}

/** SSR-safe; no `localStorage`. */
export function typicalQuizGenerationHint(questionCount: QuestionCount): string {
  const t = TYPICAL_QUIZ_GEN_RANGE_SEC[questionCount];
  const range = formatDurationRangeSec(t.min, t.max);
  return `For ${questionCount} questions, this usually takes about ${range} (model load and retries vary).`;
}

/** Client-only: includes recent runs when enough samples exist. */
export function fullQuizGenerationHint(questionCount: QuestionCount): string {
  const typical = TYPICAL_QUIZ_GEN_RANGE_SEC[questionCount];
  const typicalStr = formatDurationRangeSec(typical.min, typical.max);

  const samples = (readStore()[questionCount] ?? []).filter(Number.isFinite);
  if (samples.length >= 2) {
    const sorted = [...samples].sort((a, b) => a - b);
    const low = sorted[0]!;
    const high = sorted[sorted.length - 1]!;
    const padLo = Math.max(1, Math.floor(low * 0.85));
    const padHi = Math.ceil(high * 1.2);
    const yours = formatDurationRangeSec(padLo, padHi);
    return `Based on your recent runs: about ${yours}. Typical for ${questionCount} questions: ${typicalStr}.`;
  }

  return typicalQuizGenerationHint(questionCount);
}
