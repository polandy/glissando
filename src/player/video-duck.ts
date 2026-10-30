import { isGroundSlide, type Slide } from "./slideshow";

/** The music's volume factor while a clip with sound plays (ADR-0035): stays audible under it. */
export const VIDEO_DUCK_VOLUME = 0.2;
/** The linear ramp down before a clip's slide: so the music is already low once the sound starts. */
export const VIDEO_DUCK_RAMP_DOWN_MS = 1000;
/** The linear ramp up after the slide ends: slow, so the music swells back instead of jumping. */
export const VIDEO_DUCK_RAMP_UP_MS = 1500;

/** A stretch of show time in which a clip's sound is heard. */
export interface VideoSoundSpan {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * The spans, in show time and order, in which a clip with sound plays and the music ducks:
 * volume above 0 and `duckMusic` not `false`. A clip's sound starts with its slide.
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
 * The factor the music's volume is multiplied by at show time `timeMs`: 1 outside a span,
 * ramping down to `VIDEO_DUCK_VOLUME` over the `VIDEO_DUCK_RAMP_DOWN_MS` before its start so the
 * music is already low once the clip's own sound starts, held until the span ends, then ramping
 * back up over `VIDEO_DUCK_RAMP_UP_MS`. `spans` are in order; two closer than a ramp up plus a
 * ramp down stay ducked between them. The music's own trim and fades multiply on top.
 */
export function duckFactorAt(timeMs: number, spans: readonly VideoSoundSpan[]): number {
  let factor = 1;
  for (const span of mergeCloseSpans(spans)) {
    const rampingDown = clamp01(1 - (span.startMs - timeMs) / VIDEO_DUCK_RAMP_DOWN_MS);
    const rampingUp = clamp01(1 - (timeMs - span.endMs) / VIDEO_DUCK_RAMP_UP_MS);
    const duckAmount = Math.min(rampingDown, rampingUp);
    // Interpolated from the ducked end, so a full duck is `VIDEO_DUCK_VOLUME` exactly, not a float off it.
    factor = Math.min(factor, VIDEO_DUCK_VOLUME + (1 - VIDEO_DUCK_VOLUME) * (1 - duckAmount));
  }
  return factor;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
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
    if (
      previous !== undefined &&
      span.startMs - previous.endMs < VIDEO_DUCK_RAMP_UP_MS + VIDEO_DUCK_RAMP_DOWN_MS
    ) {
      merged[merged.length - 1] = { startMs: previous.startMs, endMs: span.endMs };
    } else {
      merged.push(span);
    }
  }
  return merged;
}
