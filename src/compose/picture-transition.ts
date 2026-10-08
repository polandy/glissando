import { CUT_TRANSITION } from "../library/own-timing";
import type { StoredPicture } from "../library/stored-slideshow";
import type { Transition } from "../player/slideshow";
import { autoTransitionEffect, transitionDurationMs } from "./auto-transition";

/**
 * The transition the picture at `index` hands over with: its own effect (which stays with it
 * wherever it moves), otherwise the automatic one for the position. A cut has none, and the last
 * slide has none to carry it (ADR-0002), even with an own one stored (ADR-0008).
 */
export function pictureTransition(
  index: number,
  slideCount: number,
  picture: StoredPicture,
  slideDurationMs: number,
): Transition | undefined {
  const choice = picture.transition ?? autoTransitionEffect(index);
  if (index === slideCount - 1 || choice === CUT_TRANSITION) {
    return undefined;
  }
  return { effect: choice, durationMs: transitionDurationMs(slideDurationMs) };
}
