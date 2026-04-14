/** Shared color map for topic cards — used by topic grid, onboarding, etc. */

export const COLOR_MAP: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-800",    text: "text-rose-600 dark:text-rose-400",    ring: "ring-rose-400" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/30",   border: "border-purple-200 dark:border-purple-800", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-400" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800",    text: "text-blue-600 dark:text-blue-400",    ring: "ring-blue-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800",  text: "text-amber-600 dark:text-amber-400",  ring: "ring-amber-400" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/30",       border: "border-teal-200 dark:border-teal-800",    text: "text-teal-600 dark:text-teal-400",    ring: "ring-teal-400" },
  green:   { bg: "bg-green-50 dark:bg-green-950/30",     border: "border-green-200 dark:border-green-800",  text: "text-green-600 dark:text-green-400",  ring: "ring-green-400" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-950/30",   border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-600 dark:text-yellow-400", ring: "ring-yellow-400" },
  slate:   { bg: "bg-slate-50 dark:bg-slate-800/40",     border: "border-slate-200 dark:border-slate-700",  text: "text-slate-600 dark:text-slate-400",  ring: "ring-slate-400" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/30",   border: "border-violet-200 dark:border-violet-800", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-400" },
  lime:    { bg: "bg-lime-50 dark:bg-lime-950/30",       border: "border-lime-200 dark:border-lime-800",    text: "text-lime-600 dark:text-lime-400",    ring: "ring-lime-400" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/30",   border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-400" },
  pink:    { bg: "bg-pink-50 dark:bg-pink-950/30",       border: "border-pink-200 dark:border-pink-800",    text: "text-pink-600 dark:text-pink-400",    ring: "ring-pink-400" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/30",       border: "border-cyan-200 dark:border-cyan-800",    text: "text-cyan-600 dark:text-cyan-400",    ring: "ring-cyan-400" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/30",         border: "border-sky-200 dark:border-sky-800",      text: "text-sky-600 dark:text-sky-400",      ring: "ring-sky-400" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-orange-200 dark:border-orange-800", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-400" },
  fuchsia: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-200 dark:border-fuchsia-800", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-400" },
  stone:   { bg: "bg-stone-50 dark:bg-stone-800/40",     border: "border-stone-200 dark:border-stone-700",  text: "text-stone-600 dark:text-stone-400",  ring: "ring-stone-400" },
  red:     { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-200 dark:border-red-800",      text: "text-red-600 dark:text-red-400",      ring: "ring-red-400" },
};

const DEFAULT_COLORS = COLOR_MAP.slate!;

export function getTopicColors(color: string | null) {
  return COLOR_MAP[color ?? ""] ?? DEFAULT_COLORS;
}
