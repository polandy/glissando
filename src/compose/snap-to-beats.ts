/**
 * Moves the boundaries that end an automatic slide onto the music's beats (ADR-0021): each to the
 * nearest beat that leaves its slide and the next automatic one at least `minSlideMs`, else where
 * it was. Pictures with an own duration between the two move along and stay exact, so the boundary
 * after them is not snapped. The excerpt's end never moves, nor does a boundary followed by own
 * durations only. The sum of the durations does not change.
 */
export function snapToBeats(
  durationsMs: readonly number[],
  /** Per slide: whether its duration is automatic, and so may change. */
  automatic: readonly boolean[],
  /** In ms of the excerpt, ascending. */
  beatsMs: readonly number[],
  minSlideMs: number,
): number[] {
  const snappedMs = [...durationsMs];
  let startMs = 0;
  for (let index = 0; index < snappedMs.length; index += 1) {
    const nextAutomatic = automatic.indexOf(true, index + 1);
    if (automatic[index] && nextAutomatic !== -1) {
      const endMs = startMs + (snappedMs[index] as number);
      const ownBetweenMs = sum(snappedMs.slice(index + 1, nextAutomatic));
      const nextEndMs = endMs + ownBetweenMs + (snappedMs[nextAutomatic] as number);
      const beatMs = nearestBeatMs(
        beatsMs,
        endMs,
        startMs + minSlideMs,
        nextEndMs - ownBetweenMs - minSlideMs,
      );
      if (beatMs !== undefined) {
        snappedMs[index] = beatMs - startMs;
        snappedMs[nextAutomatic] = nextEndMs - beatMs - ownBetweenMs;
      }
    }
    startMs += snappedMs[index] as number;
  }
  return snappedMs;
}

function sum(durationsMs: readonly number[]): number {
  return durationsMs.reduce((total, durationMs) => total + durationMs, 0);
}

/** The beat nearest `targetMs` from `earliestMs` to `latestMs`; the earlier one on a tie. */
function nearestBeatMs(
  beatsMs: readonly number[],
  targetMs: number,
  earliestMs: number,
  latestMs: number,
): number | undefined {
  let nearest: number | undefined;
  for (const beatMs of beatsMs) {
    const fits = beatMs >= earliestMs && beatMs <= latestMs;
    if (
      fits &&
      (nearest === undefined || Math.abs(beatMs - targetMs) < Math.abs(nearest - targetMs))
    ) {
      nearest = beatMs;
    }
  }
  return nearest;
}
