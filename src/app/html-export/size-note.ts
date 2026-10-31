import type { PageSizeId } from "../../html-export/plan";

/** Estimates within this ratio of each other read as one size: clips go in whole at every size. */
export const BARELY_DIFFERENT_RATIO = 1.05;

/** The size a page starts on when the picture size hardly matters. */
const PRESELECTED_WHEN_ALIKE: PageSizeId = "sharp";

/** True when the largest estimate is at most {@link BARELY_DIFFERENT_RATIO} times the smallest. */
export function sizesBarelyDiffer(estimates: readonly number[]): boolean {
  if (estimates.length === 0) {
    return false;
  }
  const smallest = Math.min(...estimates);
  return smallest > 0 && Math.max(...estimates) / smallest <= BARELY_DIFFERENT_RATIO;
}

/** Standard when the sizes barely differ and the user has not picked one; else the current size. */
export function preselectedPageSize(
  current: PageSizeId,
  barelyDiffer: boolean,
  userChose: boolean,
): PageSizeId {
  return barelyDiffer && !userChose ? PRESELECTED_WHEN_ALIKE : current;
}
