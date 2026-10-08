import type { Slide, TransitionEffect } from "./slideshow";

/** A slide on screen and how far its Ken Burns has run (linear, 0..1). */
export interface SlideAtTime {
  readonly index: number;
  readonly kenBurnsProgress: number;
}

export type TimelineFrame =
  | { readonly kind: "slide"; readonly slide: SlideAtTime }
  | {
      readonly kind: "transition";
      readonly effect: TransitionEffect;
      /** Linear, 0..1. */
      readonly progress: number;
      readonly from: SlideAtTime;
      readonly to: SlideAtTime;
    };

export interface Timeline {
  readonly durationMs: number;
  /** What is on screen at `timeMs`, clamped to the slideshow. */
  frameAt(timeMs: number): TimelineFrame;
}

interface SlideSpan {
  readonly endMs: number;
  /** From its incoming transition's start (or its own start) to its end. */
  readonly visibleFromMs: number;
  readonly transitionFromMs: number;
}

/**
 * Lays slides end to end. A transition runs during the last part of the outgoing slide, and
 * the incoming slide's Ken Burns starts with it, so the total is the sum of slide durations.
 */
export function createTimeline(slides: readonly Slide[]): Timeline {
  const spans: SlideSpan[] = [];
  let startMs = 0;
  let incomingTransitionMs = 0;
  for (const slide of slides) {
    const endMs = startMs + slide.durationMs;
    const outgoingTransitionMs = slide.transitionToNext?.durationMs ?? 0;
    spans.push({
      endMs,
      visibleFromMs: startMs - incomingTransitionMs,
      transitionFromMs: endMs - outgoingTransitionMs,
    });
    startMs = endMs;
    incomingTransitionMs = outgoingTransitionMs;
  }
  const durationMs = startMs;

  function slideAt(index: number, timeMs: number): SlideAtTime {
    const span = spanAt(index);
    const progress = (timeMs - span.visibleFromMs) / (span.endMs - span.visibleFromMs);
    return { index, kenBurnsProgress: Math.min(1, Math.max(0, progress)) };
  }

  function spanAt(index: number): SlideSpan {
    const span = spans[index];
    if (span === undefined) {
      throw new RangeError(`no slide at index ${index}`);
    }
    return span;
  }

  return {
    durationMs,
    frameAt(timeMs) {
      const clampedMs = Math.min(durationMs, Math.max(0, timeMs));
      const found = spans.findIndex((span) => clampedMs < span.endMs);
      const index = found === -1 ? spans.length - 1 : found;
      const span = spanAt(index);
      const transition = slides[index]?.transitionToNext;
      if (transition === undefined || clampedMs < span.transitionFromMs || found === -1) {
        return { kind: "slide", slide: slideAt(index, clampedMs) };
      }
      return {
        kind: "transition",
        effect: transition.effect,
        progress: (clampedMs - span.transitionFromMs) / transition.durationMs,
        from: slideAt(index, clampedMs),
        to: slideAt(index + 1, clampedMs),
      };
    },
  };
}
