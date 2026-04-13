/**
 * Shared quiz scoring rules.
 *
 * Used by both the client-side quiz runner (for live feedback) and the server
 * route `/api/quiz/complete` (for persistence) so the displayed score and the
 * saved score always match.
 *
 * Rules — streak-based combo scoring:
 *   streak 1–2: base (10)
 *   streak 3–4: base + 5 bonus    → 15 per correct
 *   streak 5+:  base × 2          → 20 per correct
 */

export const BASE_POINTS = 10;

export function pointsForStreak(nextStreak: number): { base: number; bonus: number } {
  if (nextStreak >= 5) return { base: BASE_POINTS, bonus: BASE_POINTS };
  if (nextStreak >= 3) return { base: BASE_POINTS, bonus: 5 };
  return { base: BASE_POINTS, bonus: 0 };
}

/**
 * Walk an ordered list of correctness flags and produce the final score +
 * max streak, applying the combo rules above.
 *
 * Returns `basePoints` (10 per correct) and `streakPoints` (bonus from combos)
 * separately so the leaderboard can display both.  `score` = basePoints + streakPoints.
 */
export function computeStreakScore(isCorrectOrdered: boolean[]): {
  score: number;
  basePoints: number;
  streakPoints: number;
  streakMax: number;
} {
  let basePoints = 0;
  let streakPoints = 0;
  let streak = 0;
  let streakMax = 0;
  for (const ok of isCorrectOrdered) {
    if (ok) {
      streak += 1;
      if (streak > streakMax) streakMax = streak;
      const { base, bonus } = pointsForStreak(streak);
      basePoints += base;
      streakPoints += bonus;
    } else {
      streak = 0;
    }
  }
  return { score: basePoints + streakPoints, basePoints, streakPoints, streakMax };
}
