import { MIN_MUSIC_EXCERPT_MS, type MusicTrim } from "../../library/own-music";
import { MILLISECONDS_PER_SECOND } from "../../player";

/** The music editor's handles and steppers move an edge of the excerpt. */
export type TrimEdge = "start" | "end";
export type TrimStepDirection = "earlier" | "later";

/** Where the handles land: a tenth of a second. */
export const TRIM_SNAP_MS = MILLISECONDS_PER_SECOND / 10;
/** An arrow key on a handle; with Shift, the large step. */
export const ARROW_STEP_MS = TRIM_SNAP_MS;
export const ARROW_STEP_LARGE_MS = MILLISECONDS_PER_SECOND;
/** The − and + of the time steppers. */
export const STEPPER_STEP_MS = MILLISECONDS_PER_SECOND / 2;

const SIGN: Readonly<Record<TrimStepDirection, number>> = { earlier: -1, later: 1 };

/**
 * `trim` with `edge` moved to `atMs`, snapped, within the track and keeping the excerpt at least
 * `MIN_MUSIC_EXCERPT_MS` long; the other edge stays.
 */
export function moveTrimEdge(
  trim: MusicTrim,
  edge: TrimEdge,
  atMs: number,
  durationMs: number,
): MusicTrim {
  const snapped = Math.round(atMs / TRIM_SNAP_MS) * TRIM_SNAP_MS;
  return edge === "start"
    ? { ...trim, startMs: clamp(snapped, 0, trim.endMs - MIN_MUSIC_EXCERPT_MS) }
    : { ...trim, endMs: clamp(snapped, trim.startMs + MIN_MUSIC_EXCERPT_MS, durationMs) };
}

/** One stepper step of `edge`. */
export function stepTrimEdge(
  trim: MusicTrim,
  edge: TrimEdge,
  direction: TrimStepDirection,
  durationMs: number,
): MusicTrim {
  const atMs = edge === "start" ? trim.startMs : trim.endMs;
  return moveTrimEdge(trim, edge, atMs + SIGN[direction] * STEPPER_STEP_MS, durationMs);
}

/** Whether a step of `edge` would move it. */
export function canStepTrimEdge(
  trim: MusicTrim,
  edge: TrimEdge,
  direction: TrimStepDirection,
  durationMs: number,
): boolean {
  const stepped = stepTrimEdge(trim, edge, direction, durationMs);
  return edge === "start" ? stepped.startMs !== trim.startMs : stepped.endMs !== trim.endMs;
}

/** The edge a grab at `atMs` takes: the nearer one, the start on a tie. */
export function nearerEdge(trim: MusicTrim, atMs: number): TrimEdge {
  return Math.abs(atMs - trim.startMs) <= Math.abs(atMs - trim.endMs) ? "start" : "end";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
