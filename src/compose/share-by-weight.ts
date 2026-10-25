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

/**
 * `shareByWeightMs`, but no share may fall below `minMs`: a share that would is raised to
 * `minMs` and the rest of `totalMs` is shared again, by weight, among the shares still free to
 * move, repeated until none is below. `null` when `totalMs` cannot give every weight the minimum
 * at all (`weights.length * minMs > totalMs`), so the shares still add up to `totalMs` exactly
 * whenever this does return.
 */
export function shareByWeightWithMinimumMs(
  weights: readonly number[],
  totalMs: number,
  minMs: number,
): number[] | null {
  if (weights.length * minMs > totalMs) {
    return null;
  }
  const shares = new Array<number>(weights.length).fill(minMs);
  const raised = new Array<boolean>(weights.length).fill(false);
  let settled = false;
  while (!settled) {
    settled = true;
    const freeIndexes = raised.flatMap((isRaised, index) => (isRaised ? [] : [index]));
    const freeTotalMs = totalMs - raised.filter(Boolean).length * minMs;
    const freeShares = shareByWeightMs(
      freeIndexes.map((index) => weights[index] as number),
      freeTotalMs,
    );
    freeIndexes.forEach((index, position) => {
      const share = freeShares[position] as number;
      shares[index] = share;
      if (share < minMs) {
        raised[index] = true;
        settled = false;
      }
    });
  }
  return shares.map((share, index) => (raised[index] ? minMs : share));
}
