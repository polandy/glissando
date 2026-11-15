import type { SlideUnit } from "./slide-units";

/** Two paired pictures by their 1-based numbers, the earlier first. */
export type PictureNumberPair = readonly [first: number, second: number];

/**
 * The pairs of `before` that `after` no longer holds, in play order, by 1-based picture numbers:
 * what a change to the pictures' pairing (ADR-0028) takes apart.
 */
export function pairsComingApart(
  before: readonly SlideUnit[],
  after: readonly SlideUnit[],
): readonly PictureNumberPair[] {
  const kept = new Set(after.flatMap((unit) => pairKeys(unit)));
  return before.flatMap((unit) => {
    const [first, second] = unit.pictureIndices;
    if (second === undefined || kept.has(pairKey(first, second))) {
      return [];
    }
    return [[first + 1, second + 1] as const];
  });
}

function pairKeys(unit: SlideUnit): readonly string[] {
  const [first, second] = unit.pictureIndices;
  return second === undefined ? [] : [pairKey(first, second)];
}

function pairKey(first: number, second: number): string {
  return `${first}:${second}`;
}
