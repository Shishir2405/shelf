/** The model must prefer one folder by at least this much cosine similarity, or the file stays Unsorted. */
export const MIN_MARGIN = 0.05;

export interface Scored {
  folder: string;
  similarity: number;
}

/**
 * Returns the best folder only when it clearly beats the runner-up. A wrong guess moves a file
 * somewhere the user did not expect; Unsorted costs them one look, so the margin is required.
 */
export function decide(scores: readonly Scored[], minMargin: number = MIN_MARGIN): string | null {
  const sorted = [...scores].sort((a, b) => b.similarity - a.similarity);
  const [best, second] = sorted;
  if (!best) return null;
  if (!second) return best.folder;
  return best.similarity - second.similarity >= minMargin ? best.folder : null;
}

export const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
};
