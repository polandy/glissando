import {
  MAX_OWN_DURATION_MS,
  MIN_OWN_DURATION_MS,
  OWN_DURATION_STEP_MS,
} from "../../../library/own-timing";

export type StepDirection = "shorter" | "longer";

const SIGN: Readonly<Record<StepDirection, number>> = { shorter: -1, longer: 1 };

/**
 * One step from `durationMs`: on the half-second grid, by half a second. Off it (an automatic
 * duration from shared music), the step lands on the next grid value in its direction: + up, −
 * down. Stays within the own-duration range.
 */
export function stepDurationMs(durationMs: number, direction: StepDirection): number {
  const ratio = durationMs / OWN_DURATION_STEP_MS;
  const steps = Number.isInteger(ratio)
    ? ratio + SIGN[direction]
    : direction === "longer"
      ? Math.ceil(ratio)
      : Math.floor(ratio);
  return Math.min(MAX_OWN_DURATION_MS, Math.max(MIN_OWN_DURATION_MS, steps * OWN_DURATION_STEP_MS));
}

export function canStepDuration(durationMs: number, direction: StepDirection): boolean {
  return direction === "longer"
    ? durationMs < MAX_OWN_DURATION_MS
    : durationMs > MIN_OWN_DURATION_MS;
}
