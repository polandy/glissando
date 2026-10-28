import {
  focusSlideshowSummary,
  type FocusSlideshowSummary,
  type PicturesFocus,
} from "../../focus/pictures-focus";
import type { SlideshowSearch } from "../../../library/focus-pass";

/**
 * How many pictures the More menu's faces-and-subjects entry names as not looked at (ADR-0041).
 * Only a finished search counts: progress is background work, not the menu's to show.
 */
export function focusMenuFailedCount(summary: FocusSlideshowSummary): number {
  return summary.done < summary.total ? 0 : summary.failedCount;
}

/** The entry's failed count straight from a slideshow's pictures and search progress (ADR-0041). */
export function slideshowFocusFailed(
  focus: PicturesFocus,
  pictures: readonly { readonly id: string; readonly ownMotion: boolean }[],
  search: SlideshowSearch | undefined,
  passPaused: boolean,
): number {
  return focusMenuFailedCount(focusSlideshowSummary(focus, pictures, search, passPaused));
}
