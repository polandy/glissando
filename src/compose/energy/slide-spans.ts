/** A slide's span in playlist ms: start inclusive, end exclusive. */
export interface SlideSpan {
  readonly startMs: number;
  readonly endMs: number;
}

/** Each slide's span, running cumulatively from 0 through `durationsMs`. */
export function spansOf(durationsMs: readonly number[]): SlideSpan[] {
  let startMs = 0;
  return durationsMs.map((durationMs) => {
    const span = { startMs, endMs: startMs + durationMs };
    startMs += durationMs;
    return span;
  });
}
