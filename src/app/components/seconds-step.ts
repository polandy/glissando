import {
  MAX_SECONDS_PER_PICTURE,
  MIN_SECONDS_PER_PICTURE,
  SECONDS_PER_PICTURE_STEP,
} from "../../library/stored-slideshow";

export type StepDirection = "shorter" | "longer";

const SIGN: Readonly<Record<StepDirection, number>> = { shorter: -1, longer: 1 };

/** One half-second step, landing on the half-second grid within the allowed range. */
export function stepSeconds(seconds: number, direction: StepDirection): number {
  const halves = seconds / SECONDS_PER_PICTURE_STEP;
  const steppedHalves = direction === "longer" ? Math.floor(halves) + 1 : Math.ceil(halves) - 1;
  const stepped = steppedHalves * SECONDS_PER_PICTURE_STEP;
  return Math.min(MAX_SECONDS_PER_PICTURE, Math.max(MIN_SECONDS_PER_PICTURE, stepped));
}

export function canStep(seconds: number, direction: StepDirection): boolean {
  return SIGN[direction] * (stepSeconds(seconds, direction) - seconds) > 0;
}
