import { TRANSITION_EFFECTS, type TransitionEffect } from "../player/slideshow";

/** The transition's share of its slide's duration, before the cap below. */
const TRANSITION_SHARE_OF_SLIDE = 0.3;

/** No transition runs longer than this, even on a long slide. */
export const MAX_TRANSITION_DURATION_MS = 1000;

/**
 * The automatic effect for the slide at `index`: effects cycle through `TRANSITION_EFFECTS` in
 * order, which never repeats one back to back, since the catalogue has more than one entry.
 */
export function autoTransitionEffect(index: number): TransitionEffect {
  // The modulo keeps the index within the tuple's bounds.
  return TRANSITION_EFFECTS[index % TRANSITION_EFFECTS.length] as TransitionEffect;
}

/** How long a transition runs at the end of a slide this long, own effect or automatic. */
export function transitionDurationMs(slideDurationMs: number): number {
  return Math.min(
    MAX_TRANSITION_DURATION_MS,
    Math.round(slideDurationMs * TRANSITION_SHARE_OF_SLIDE),
  );
}
