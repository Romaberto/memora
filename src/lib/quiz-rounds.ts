/** Four phases: three rounds + final boss (by question position). */

export const ROUND_COUNT = 4;

export type RoundPhase = 0 | 1 | 2 | 3;

export const ROUND_LABELS: readonly {
  title: string;
  subtitle: string;
  boss: boolean;
}[] = [
  { title: "Round 1", subtitle: "Warm-up — find your footing.", boss: false },
  { title: "Round 2", subtitle: "Heat rising — stay sharp.", boss: false },
  { title: "Round 3", subtitle: "Elite challenge.", boss: false },
  { title: "Final boss", subtitle: "Last stand — bring it home.", boss: true },
];

/**
 * Map global question index (0-based) to round 0..3 using even splits across 4 phases.
 */
export function questionRoundPhase(questionIndex: number, total: number): RoundPhase {
  if (total <= 0) return 0;
  const clamped = Math.min(Math.max(questionIndex, 0), total - 1);
  const phase = Math.min(
    ROUND_COUNT - 1,
    Math.floor((clamped * ROUND_COUNT) / total),
  );
  return phase as RoundPhase;
}

export function roundQuestionRange(
  phase: RoundPhase,
  total: number,
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const start = Math.floor((phase * total) / ROUND_COUNT);
  const end =
    phase === ROUND_COUNT - 1
      ? total
      : Math.floor(((phase + 1) * total) / ROUND_COUNT);
  return { start, end: Math.max(start, end) };
}
