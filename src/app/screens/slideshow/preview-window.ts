/**
 * The Mood sheet's preview loops on four slide units (MOOD.md): the first four as usual, or —
 * with energy pacing on and a lift found (ADR-0046) — the four around the first lift.
 */
export const PREVIEW_PICTURE_COUNT = 4;

/** How many pictures the preview's window starts before a lift it centres on. */
const UNITS_BEFORE_LIFT = 2;

/**
 * The first picture of the preview's window: the first lift's unit less `UNITS_BEFORE_LIFT`,
 * clamped so the window of `PREVIEW_PICTURE_COUNT` pictures stays inside `[0, pictureCount)`; the
 * first picture without a lift to centre on.
 */
export function previewWindowStartIndex(
  pictureCount: number,
  firstLiftUnitIndex: number | undefined,
): number {
  if (firstLiftUnitIndex === undefined) {
    return 0;
  }
  const lastStart = Math.max(0, pictureCount - PREVIEW_PICTURE_COUNT);
  return Math.min(lastStart, Math.max(0, firstLiftUnitIndex - UNITS_BEFORE_LIFT));
}
