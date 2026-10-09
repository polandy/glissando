import {
  ALTERNATE_TRANSITION,
  CUT_TRANSITION,
  DEFAULT_SLIDESHOW_TRANSITION,
  type SlideshowTransition,
  type TransitionChoice,
} from "../library/own-timing";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import type { Transition } from "../player/slideshow";
import { autoTransitionEffect, transitionDurationMs } from "./auto-transition";

/** The slideshow's default transition: the stored one, else the crossfade (ADR-0010). */
export function slideshowTransition(slideshow: StoredSlideshow): SlideshowTransition {
  return slideshow.transition ?? DEFAULT_SLIDESHOW_TRANSITION;
}

/**
 * What the picture at `index` hands over with while it has no transition of its own: the
 * slideshow's default, or for an alternating one the effect for the position.
 */
export function automaticTransition(
  index: number,
  defaultTransition: SlideshowTransition,
): TransitionChoice {
  return defaultTransition === ALTERNATE_TRANSITION
    ? autoTransitionEffect(index)
    : defaultTransition;
}

/**
 * The transition the picture at `index` hands over with: its own effect (which stays with it
 * wherever it moves), otherwise the automatic one. A cut has none, and the last slide has none
 * to carry it (ADR-0002), even with an own one stored (ADR-0008).
 */
export function pictureTransition(
  index: number,
  slideCount: number,
  picture: StoredPicture,
  slideDurationMs: number,
  defaultTransition: SlideshowTransition,
): Transition | undefined {
  const choice = picture.transition ?? automaticTransition(index, defaultTransition);
  if (index === slideCount - 1 || choice === CUT_TRANSITION) {
    return undefined;
  }
  return { effect: choice, durationMs: transitionDurationMs(slideDurationMs) };
}
