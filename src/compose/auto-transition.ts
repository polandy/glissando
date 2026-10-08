import { TRANSITION_EFFECTS, type Transition } from "../player/slideshow";

/** The transition's share of its slide's duration, before the cap below. */
const TRANSITION_SHARE_OF_SLIDE = 0.3;

/** No transition runs longer than this, even on a long slide. */
const MAX_TRANSITION_DURATION_MS = 1000;

/**
 * The automatic transition for a slide: effects cycle through `TRANSITION_EFFECTS` in order
 * (which never repeats one back to back, since the catalogue has more than one entry), and the
 * last slide has none to carry it (ADR-0002).
 */
export function autoTransition(
  index: number,
  slideCount: number,
  slideDurationMs: number,
): Transition | undefined {
  if (index === slideCount - 1) {
    return undefined;
  }
  // The modulo keeps the index within the tuple's bounds.
  const effect = TRANSITION_EFFECTS[
    index % TRANSITION_EFFECTS.length
  ] as (typeof TRANSITION_EFFECTS)[number];
  const durationMs = Math.min(
    MAX_TRANSITION_DURATION_MS,
    Math.round(slideDurationMs * TRANSITION_SHARE_OF_SLIDE),
  );
  return { effect, durationMs };
}
