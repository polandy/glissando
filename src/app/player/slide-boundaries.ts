import type { Slideshow } from "../../player";

/** Within this many seconds of a slide's start, "previous" goes to the slide before. */
export const RESTART_SLIDE_AFTER_SECONDS = 1;

const MS_PER_SECOND = 1000;

/** Where each slide starts on the slideshow's time line, in seconds. */
export interface SlideBoundaries {
  readonly starts: readonly number[];
  readonly duration: number;
}

export function slideBoundaries(slideshow: Pick<Slideshow, "slides">): SlideBoundaries {
  const starts: number[] = [];
  let elapsedMs = 0;
  for (const slide of slideshow.slides) {
    starts.push(elapsedMs / MS_PER_SECOND);
    elapsedMs += slide.durationMs;
  }
  return { starts, duration: elapsedMs / MS_PER_SECOND };
}

/** The slide on screen at `seconds`, clamped to the first and last. */
export function slideIndexAt(boundaries: SlideBoundaries, seconds: number): number {
  const following = boundaries.starts.findIndex((start) => start > seconds);
  const index = following === -1 ? boundaries.starts.length - 1 : following - 1;
  return Math.max(0, index);
}

export function nextSlideStart(boundaries: SlideBoundaries, seconds: number): number | null {
  return boundaries.starts[slideIndexAt(boundaries, seconds) + 1] ?? null;
}

/** Like a music player: back to the current slide's start, or the one before near its start. */
export function previousSlideStart(boundaries: SlideBoundaries, seconds: number): number {
  const index = slideIndexAt(boundaries, seconds);
  const currentStart = boundaries.starts[index] ?? 0;
  if (seconds - currentStart > RESTART_SLIDE_AFTER_SECONDS) {
    return currentStart;
  }
  return boundaries.starts[Math.max(0, index - 1)] ?? 0;
}
