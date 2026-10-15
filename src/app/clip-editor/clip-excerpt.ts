import { MAX_VIDEO_EXCERPT_MS, MIN_VIDEO_EXCERPT_MS } from "../../library/own-video";

/** What a handle moves by on an arrow key, and what it snaps to when dragged. */
export const HANDLE_STEP_MS = 100;
export const HANDLE_FAST_STEP_MS = 1000;

export interface Excerpt {
  readonly startMs: number;
  readonly endMs: number;
}

export type Handle = "start" | "end";

const clamp = (value: number, lowest: number, highest: number): number =>
  Math.min(Math.max(value, lowest), highest);

const snapped = (ms: number): number => Math.round(ms / HANDLE_STEP_MS) * HANDLE_STEP_MS;

/** The excerpt with its start at `startMs`: snapped, and kept 0.5 s to 5 min before the end. */
export function excerptWithStart(sourceMs: number, excerpt: Excerpt, startMs: number): Excerpt {
  const lowest = Math.max(0, excerpt.endMs - MAX_VIDEO_EXCERPT_MS);
  const highest = excerpt.endMs - MIN_VIDEO_EXCERPT_MS;
  return { startMs: clamp(snapped(startMs), lowest, highest), endMs: excerpt.endMs };
}

/** The excerpt with its end at `endMs`: snapped, and kept 0.5 s to 5 min after the start. */
export function excerptWithEnd(sourceMs: number, excerpt: Excerpt, endMs: number): Excerpt {
  const lowest = excerpt.startMs + MIN_VIDEO_EXCERPT_MS;
  const highest = Math.min(sourceMs, excerpt.startMs + MAX_VIDEO_EXCERPT_MS);
  return { startMs: excerpt.startMs, endMs: clamp(snapped(endMs), lowest, highest) };
}

const KEY_DIRECTION: Readonly<Record<string, 1 | -1>> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
};

/** The excerpt after a key on a handle (arrows step, shift steps by a second, Home/End go to the limit); null for any other key. */
export function excerptAfterKey(
  handle: Handle,
  sourceMs: number,
  excerpt: Excerpt,
  key: string,
  shift: boolean,
): Excerpt | null {
  const moveTo = (ms: number): Excerpt =>
    handle === "start"
      ? excerptWithStart(sourceMs, excerpt, ms)
      : excerptWithEnd(sourceMs, excerpt, ms);
  const current = handle === "start" ? excerpt.startMs : excerpt.endMs;
  const direction = KEY_DIRECTION[key];
  if (direction !== undefined) {
    return moveTo(current + direction * (shift ? HANDLE_FAST_STEP_MS : HANDLE_STEP_MS));
  }
  if (key === "Home") return moveTo(0);
  if (key === "End") return moveTo(sourceMs);
  return null;
}

/** The clip's time at a place on the strip, 0 at its left edge to 1 at its right. */
export function fractionToMs(fraction: number, sourceMs: number): number {
  return clamp(fraction, 0, 1) * sourceMs;
}
