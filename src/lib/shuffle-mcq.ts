/** FNV-1a 32-bit — deterministic from any string seed. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Permutation of [0..n-1]: `perm[d]` is the original option index shown at display slot `d`.
 */
export function shuffleIndicesSeeded(seed: string, n: number): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  let h = hashSeed(seed);
  for (let i = n - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

export type McqForShuffle = {
  options: string[];
  correctIndex: number;
};

/**
 * Reorder options for display; `correctIndex` is updated to match the new order.
 * `displayToOriginal[d]` = stored (DB) option index the user picks when they tap display slot `d`.
 */
export function applyDisplayShuffle<T extends McqForShuffle>(
  q: T,
  seed: string,
): { display: T; displayToOriginal: number[] } {
  const n = q.options.length;
  if (n === 0) {
    return { display: q, displayToOriginal: [] };
  }
  const perm = shuffleIndicesSeeded(seed, n);
  const newOptions = perm.map((oi) => q.options[oi]!);
  const newCorrect = perm.indexOf(q.correctIndex);
  return {
    display: { ...q, options: newOptions, correctIndex: newCorrect },
    displayToOriginal: perm,
  };
}
