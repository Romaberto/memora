export const RANK_TIERS = [
  { min: 0, max: 20, name: "Page Starter" },
  { min: 21, max: 40, name: "Recall Builder" },
  { min: 41, max: 60, name: "Memory Crafter" },
  { min: 61, max: 80, name: "Knowledge Keeper" },
  { min: 81, max: 100, name: "Master of Recall" },
] as const;

export function rankFromPercentage(percentage: number): string {
  const p = Math.round(percentage);
  for (const tier of RANK_TIERS) {
    if (p >= tier.min && p <= tier.max) return tier.name;
  }
  return RANK_TIERS[RANK_TIERS.length - 1].name;
}

export function encouragingMessage(percentage: number): string {
  if (percentage >= 90)
    return "Outstanding work—your recall is sharp. Keep building on it.";
  if (percentage >= 70)
    return "Strong session. A little more practice will make this stick even longer.";
  if (percentage >= 50)
    return "You’re on the right track. Retrieval practice rewards consistency.";
  if (percentage >= 30)
    return "Every attempt counts. Review the explanations and try again soon.";
  return "Tough set—use this as a map of what to revisit. You’ll improve quickly.";
}
