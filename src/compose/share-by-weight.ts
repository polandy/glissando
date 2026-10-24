/**
 * `totalMs` shared in proportion to `weights`, in whole ms; each share's fractional remainder,
 * summed, goes to the first slides so the shares add up to `totalMs` exactly. Used wherever a
 * length is re-shared by weight: the usual even split, and energy pacing's re-weighting.
 */
export function shareByWeightMs(weights: readonly number[], totalMs: number): number[] {
  if (weights.length === 0) {
    return [];
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const floorShares = weights.map((weight) => Math.floor((totalMs * weight) / totalWeight));
  let remainderMs = totalMs - floorShares.reduce((sum, share) => sum + share, 0);
  return floorShares.map((share) => {
    if (remainderMs > 0) {
      remainderMs -= 1;
      return share + 1;
    }
    return share;
  });
}
