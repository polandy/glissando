import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { ResetUndo } from "./reset-undo";

/**
 * Offers the "Mood is now Custom" undo when `before`'s mood just left by an edit that reached
 * `after`; the undo restores the slideshow to `before` as it was (ADR-0045 `leaveMood`).
 */
export function offerMoodLeftUndo(
  reset: ResetUndo,
  before: StoredSlideshow,
  after: StoredSlideshow,
  text: () => string,
  apply: (slideshow: StoredSlideshow) => void,
): void {
  if (before.mood !== undefined && after.mood === undefined) {
    reset.offer(before.id, "slideshowMood", text(), () => apply(before));
  }
}
