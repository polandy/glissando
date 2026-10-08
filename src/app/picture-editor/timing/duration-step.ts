import {
  MAX_OWN_DURATION_MS,
  MIN_OWN_DURATION_MS,
  OWN_DURATION_STEP_MS,
} from "../../../library/own-timing";

export type StepDirection = "shorter" | "longer";

const SIGN: Readonly<Record<StepDirection, number>> = { shorter: -1, longer: 1 };

/**
 * One step from `durationMs`: an automatic duration off the half-second grid (shared music)
 * first rounds onto it. Stays within the own-duration range.
 */
export function stepDurationMs(durationMs: number, direction: StepDirection): number {
  const steps = Math.round(durationMs / OWN_DURATION_STEP_MS) + SIGN[direction];
  return Math.min(MAX_OWN_DURATION_MS, Math.max(MIN_OWN_DURATION_MS, steps * OWN_DURATION_STEP_MS));
}

export function canStepDuration(durationMs: number, direction: StepDirection): boolean {
  return direction === "longer"
    ? durationMs < MAX_OWN_DURATION_MS
    : durationMs > MIN_OWN_DURATION_MS;
}
