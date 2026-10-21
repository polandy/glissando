import {
  focusSlideshowSummary,
  type FocusSlideshowSummary,
  type PicturesFocus,
} from "../../focus/pictures-focus";
import type { SlideshowSearch } from "../../../library/focus-pass";

/** What the More menu's Focus entry says under its label (ADR-0041). */
export type FocusMenuHint =
  | {
      readonly kind: "looking";
      readonly again: boolean;
      readonly done: number;
      readonly total: number;
    }
  | { readonly kind: "failed"; readonly count: number }
  | { readonly kind: "done" };

/** Picks the Focus entry's hint from a slideshow's focus summary: pending work first, then failures. */
export function focusMenuHint(summary: FocusSlideshowSummary): FocusMenuHint {
  if (summary.done < summary.total) {
    return { kind: "looking", again: summary.again, done: summary.done, total: summary.total };
  }
  if (summary.failedCount > 0) {
    return { kind: "failed", count: summary.failedCount };
  }
  return { kind: "done" };
}

/** The Focus entry's hint straight from a slideshow's pictures and search progress (ADR-0041). */
export function slideshowFocusMenuHint(
  focus: PicturesFocus,
  pictures: readonly { readonly id: string; readonly ownMotion: boolean }[],
  search: SlideshowSearch | undefined,
  passPaused: boolean,
): FocusMenuHint {
  return focusMenuHint(focusSlideshowSummary(focus, pictures, search, passPaused));
}
