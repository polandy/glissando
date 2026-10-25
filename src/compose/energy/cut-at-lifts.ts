import type { InsertedTime } from "../inserted-time";
import { spansOf, type SlideSpan } from "./slide-spans";

/**
 * The durations with each lift (ADR-0046, "Lifts") cut onto the nearest boundary between two
 * automatic slides, moving that boundary exactly onto the lift. A boundary touching an own
 * duration is never a candidate. A lift is skipped — left as it was — when moving its nearest
 * candidate boundary would take either of the two slides it falls between below `minSlideMs`;
 * there is no fallback to the next-nearest boundary. Lifts are applied in the given order, each
 * onto the boundaries left by the one before.
 *
 * `inserted` is how much of a title card or chapter plays around each slide unit (`InsertedTime`)
 * — absent with neither — so a lift, already in real playlist time, is matched and cut against
 * each slide's real span, not its nominal one.
 */
export function cutAtLifts(
  durationsMs: readonly number[],
  automatic: readonly boolean[],
  liftsMs: readonly number[],
  minSlideMs: number,
  inserted?: InsertedTime,
): number[] {
  let result = [...durationsMs];
  for (const liftMs of liftsMs) {
    result = cutAtLift(result, automatic, liftMs, minSlideMs, inserted);
  }
  return result;
}

function cutAtLift(
  durationsMs: readonly number[],
  automatic: readonly boolean[],
  liftMs: number,
  minSlideMs: number,
  inserted: InsertedTime | undefined,
): number[] {
  const spans = spansOf(durationsMs, inserted);
  const boundary = nearestBoundary(spans, automatic, liftMs);
  if (boundary === undefined) {
    return [...durationsMs];
  }
  const { index, span, nextSpan } = boundary;
  // The boundary's two nominal, own durations: the lift sits in real time, so a card or chapter
  // widening either slide's own end (`ownMs`) is backed out before storing the nominal lengths.
  const ownAtIndexMs = inserted?.ownMs[index] ?? 0;
  const ownAtNextMs = inserted?.ownMs[index + 1] ?? 0;
  const firstMs = liftMs - span.startMs - ownAtIndexMs;
  const secondMs = nextSpan.endMs - liftMs - ownAtNextMs;
  if (firstMs < minSlideMs || secondMs < minSlideMs) {
    return [...durationsMs];
  }
  const result = [...durationsMs];
  result[index] = firstMs;
  result[index + 1] = secondMs;
  return result;
}

interface Boundary {
  readonly index: number;
  readonly span: SlideSpan;
  readonly nextSpan: SlideSpan;
}

/** The boundary between two consecutive automatic slides nearest to `liftMs`, if any. */
function nearestBoundary(
  spans: readonly SlideSpan[],
  automatic: readonly boolean[],
  liftMs: number,
): Boundary | undefined {
  let nearest: Boundary | undefined;
  let nearestDistanceMs = Infinity;
  for (let index = 0; index < spans.length - 1; index += 1) {
    if (!automatic[index] || !automatic[index + 1]) {
      continue;
    }
    const span = spans[index] as SlideSpan;
    const distanceMs = Math.abs(span.endMs - liftMs);
    if (distanceMs < nearestDistanceMs) {
      nearestDistanceMs = distanceMs;
      nearest = { index, span, nextSpan: spans[index + 1] as SlideSpan };
    }
  }
  return nearest;
}
