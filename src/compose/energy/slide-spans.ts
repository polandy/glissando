import { realOffsetsMs, type InsertedTime } from "../inserted-time";

/** A slide's span in playlist ms: start inclusive, end exclusive. */
export interface SlideSpan {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * Each slide's real span in playlist ms: `durationsMs` run cumulatively from 0, plus whatever a
 * title card or chapter inserts around it (`inserted`, `InsertedTime`) — absent, the plain
 * cumulative positions. The playlist's energy and lifts are already in that real time.
 */
export function spansOf(durationsMs: readonly number[], inserted?: InsertedTime): SlideSpan[] {
  const offsets = realOffsetsMs(inserted, durationsMs.length);
  let nominalStartMs = 0;
  return durationsMs.map((durationMs, index) => {
    const span = {
      startMs: nominalStartMs + (offsets.startMs[index] as number),
      endMs: nominalStartMs + durationMs + (offsets.endMs[index] as number),
    };
    nominalStartMs += durationMs;
    return span;
  });
}
