import { isGroundSlide, type Slide } from "./slideshow";

/** The music's volume factor while a clip with sound plays (ADR-0035). */
export const VIDEO_DUCK_VOLUME = 0.15;
/** The linear ramp down before a clip's slide and up after it. */
export const VIDEO_DUCK_RAMP_MS = 400;

/** A stretch of show time in which a clip's sound is heard. */
export interface VideoSoundSpan {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * The spans, in show time and order, in which a clip with sound plays and the music ducks:
 * volume above 0 and `duckMusic` not `false`.
 */
export function videoSoundSpans(slides: readonly Slide[]): readonly VideoSoundSpan[] {
  const spans: VideoSoundSpan[] = [];
  let startMs = 0;
  for (const slide of slides) {
    const endMs = startMs + slide.durationMs;
    if (
      !isGroundSlide(slide) &&
      slide.video !== undefined &&
      slide.video.volume > 0 &&
      slide.video.duckMusic !== false
    ) {
      spans.push({ startMs, endMs });
    }
    startMs = endMs;
  }
  return spans;
}

/**
 * The factor the music's volume is multiplied by at show time `timeMs`: 1 outside the spans,
 * `VIDEO_DUCK_VOLUME` inside, linear ramps either side. `spans` are in order; two closer than
 * two ramps stay ducked between them. The music's own trim and fades multiply on top.
 */
export function duckFactorAt(timeMs: number, spans: readonly VideoSoundSpan[]): number {
  let factor = 1;
  for (const span of mergeCloseSpans(spans)) {
    const distanceMs = Math.max(span.startMs - timeMs, timeMs - span.endMs, 0);
    const ramped = VIDEO_DUCK_VOLUME + (1 - VIDEO_DUCK_VOLUME) * (distanceMs / VIDEO_DUCK_RAMP_MS);
    factor = Math.min(factor, ramped);
  }
  return Math.min(1, factor);
}

/** `duckFactorAt` for the sound spans of `slides`, as the music's per-time factor. */
export function duckFactorFor(slides: readonly Slide[]): (timeMs: number) => number {
  const spans = videoSoundSpans(slides);
  return (timeMs) => duckFactorAt(timeMs, spans);
}

function mergeCloseSpans(spans: readonly VideoSoundSpan[]): readonly VideoSoundSpan[] {
  const merged: VideoSoundSpan[] = [];
  for (const span of spans) {
    const previous = merged.at(-1);
    if (previous !== undefined && span.startMs - previous.endMs < 2 * VIDEO_DUCK_RAMP_MS) {
      merged[merged.length - 1] = { startMs: previous.startMs, endMs: span.endMs };
    } else {
      merged.push(span);
    }
  }
  return merged;
}
