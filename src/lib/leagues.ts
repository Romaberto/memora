/**
 * 20-tier league system.
 *
 * Each tier has a minimum total-points threshold.  Users are assigned to the
 * highest tier whose threshold they meet.  The list is ordered from lowest
 * to highest — `LEAGUES[0]` is the entry-level tier.
 *
 * Design rationale:
 *   - 20 tiers keeps progression visible and motivating (Duolingo-style).
 *   - Calibrated for the streak-era point economy: a solid completed quiz
 *     often earns ~100-200 activity points, while larger custom quizzes can
 *     earn more. Early tiers should move, but not every few sessions.
 *   - Exponential-ish spacing after the first few tiers keeps long-term
 *     progression meaningful.
 *   - Knowledge-themed names (Novice → Archon) with color palette for UI badges.
 */

export type League = {
  /** Display name */
  name: string;
  /** Minimum total points to enter this tier */
  minPoints: number;
  /** Tailwind text color class for badges / labels */
  color: string;
  /** Tailwind bg color class for badge background */
  bg: string;
  /** Optional emoji icon */
  icon: string;
};

export const LEAGUES: League[] = [
  { name: "Novice",      minPoints: 0,         color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800",     icon: "📒" },
  { name: "Pupil",       minPoints: 500,       color: "text-orange-400",  bg: "bg-orange-50 dark:bg-orange-950/40", icon: "✏️" },
  { name: "Apprentice",  minPoints: 1_250,     color: "text-stone-500",   bg: "bg-stone-100 dark:bg-stone-800",     icon: "📖" },
  { name: "Student",     minPoints: 2_500,     color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/40",   icon: "🎒" },
  { name: "Scholar",     minPoints: 4_500,     color: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800",       icon: "📚" },
  { name: "Scribe",      minPoints: 7_500,     color: "text-slate-400",   bg: "bg-slate-50 dark:bg-slate-800/60",   icon: "🖋️" },
  { name: "Thinker",     minPoints: 12_000,    color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-950/40", icon: "💡" },
  { name: "Analyst",     minPoints: 18_000,    color: "text-cyan-400",    bg: "bg-cyan-50 dark:bg-cyan-950/40",     icon: "🔬" },
  { name: "Researcher",  minPoints: 27_000,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/40",     icon: "🧪" },
  { name: "Mentor",      minPoints: 40_000,    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", icon: "🎓" },
  { name: "Professor",   minPoints: 60_000,    color: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/40",       icon: "🏛️" },
  { name: "Philosopher", minPoints: 90_000,    color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/40", icon: "🦉" },
  { name: "Strategist",  minPoints: 135_000,   color: "text-gray-300",    bg: "bg-gray-50 dark:bg-gray-800/60",     icon: "♟️" },
  { name: "Visionary",   minPoints: 200_000,   color: "text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/40",   icon: "🔭" },
  { name: "Luminary",    minPoints: 300_000,   color: "text-sky-400",     bg: "bg-sky-50 dark:bg-sky-950/40",       icon: "🌟" },
  { name: "Polymath",    minPoints: 450_000,   color: "text-indigo-300",  bg: "bg-indigo-50 dark:bg-indigo-950/40", icon: "🧬" },
  { name: "Oracle",      minPoints: 675_000,   color: "text-zinc-400",    bg: "bg-zinc-100 dark:bg-zinc-800",       icon: "🔮" },
  { name: "Sage",        minPoints: 1_000_000, color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950/40",     icon: "🧙" },
  { name: "Mastermind",  minPoints: 1_500_000, color: "text-yellow-300",  bg: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40", icon: "🧠" },
  { name: "Archon",      minPoints: 2_250_000, color: "text-violet-400",  bg: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40", icon: "👁️" },
];

/**
 * Return the league for a given total-points value.
 * Always returns a league (Spark at minimum).
 */
export function getLeague(totalPoints: number): League {
  // Walk backwards from highest to find the matching tier
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (totalPoints >= LEAGUES[i]!.minPoints) return LEAGUES[i]!;
  }
  return LEAGUES[0]!;
}

/**
 * Return the next league above the current one, or null if already at max.
 */
export function getNextLeague(totalPoints: number): League | null {
  const current = getLeague(totalPoints);
  const idx = LEAGUES.indexOf(current);
  return idx < LEAGUES.length - 1 ? LEAGUES[idx + 1]! : null;
}

/**
 * Progress percentage towards the next league (0–100).
 * Returns 100 if already at the max league.
 */
export function leagueProgress(totalPoints: number): number {
  const next = getNextLeague(totalPoints);
  if (!next) return 100;
  const current = getLeague(totalPoints);
  const range = next.minPoints - current.minPoints;
  if (range <= 0) return 100;
  return Math.min(100, Math.round(((totalPoints - current.minPoints) / range) * 100));
}
