import {
  MILLISECONDS_PER_SECOND,
  TRANSITION_EFFECTS,
  type TransitionEffect,
} from "../player/slideshow";
import {
  MAX_SECONDS_PER_PICTURE,
  MIN_SECONDS_PER_PICTURE,
  SECONDS_PER_PICTURE_STEP,
} from "./stored-slideshow";

/**
 * A picture's own timing, set in the picture editor: how long it shows and how it hands over to
 * the next picture. Absent fields are automatic; a transition's length is always derived, never
 * stored. See ADR-0008.
 */

/** The next picture follows without a transition. */
export const CUT_TRANSITION = "cut";

/** The choices for a picture's own transition: the player's effects plus the cut. */
export const TRANSITION_CHOICES = [...TRANSITION_EFFECTS, CUT_TRANSITION] as const;
export type TransitionChoice = TransitionEffect | typeof CUT_TRANSITION;

export const MIN_OWN_DURATION_MS = MIN_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;
export const MAX_OWN_DURATION_MS = MAX_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;
export const OWN_DURATION_STEP_MS = SECONDS_PER_PICTURE_STEP * MILLISECONDS_PER_SECOND;

export class InvalidOwnTimingError extends Error {
  constructor(
    where: string,
    /** The bad field of the picture: `durationMs` or `transition`. */
    readonly field: string,
    readonly expected: string,
    readonly actual: unknown,
  ) {
    super(`${where} ${field}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "InvalidOwnTimingError";
  }
}

/** `value` as an own duration; throws `InvalidOwnTimingError` naming `where`. */
export function checkOwnDurationMs(value: unknown, where: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_OWN_DURATION_MS ||
    value > MAX_OWN_DURATION_MS ||
    value % OWN_DURATION_STEP_MS !== 0
  ) {
    throw new InvalidOwnTimingError(
      where,
      "durationMs",
      `whole milliseconds from ${MIN_OWN_DURATION_MS} to ${MAX_OWN_DURATION_MS} in steps of ${OWN_DURATION_STEP_MS}`,
      value,
    );
  }
  return value;
}

/** `value` as an own transition; throws `InvalidOwnTimingError` naming `where`. */
export function checkTransitionChoice(value: unknown, where: string): TransitionChoice {
  const choice = TRANSITION_CHOICES.find((candidate) => candidate === value);
  if (choice === undefined) {
    throw new InvalidOwnTimingError(
      where,
      "transition",
      `one of ${TRANSITION_CHOICES.join(", ")}`,
      value,
    );
  }
  return choice;
}
