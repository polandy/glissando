/**
 * Moves the boundaries between two automatic slides onto the music's beats (ADR-0021): each to
 * the nearest beat that leaves both its slides at least `minSlideMs`, else where it was. Every
 * other boundary stays: the excerpt's end, and either side of a picture with an own duration.
 * The sum of the durations does not change.
 */
export function snapToBeats(
  durationsMs: readonly number[],
  /** Per slide: whether its duration is automatic, and so may move. */
  automatic: readonly boolean[],
  /** In ms of the excerpt, ascending. */
  beatsMs: readonly number[],
  minSlideMs: number,
): number[] {
  const boundariesMs = endsMs(durationsMs);
  // The last boundary is the slideshow's end; it never moves.
  for (let index = 0; index < boundariesMs.length - 1; index += 1) {
    if (!automatic[index] || !automatic[index + 1]) {
      continue;
    }
    const startMs = boundariesMs[index - 1] ?? 0;
    const nextMs = boundariesMs[index + 1] as number;
    const snappedMs = nearestBeatMs(
      beatsMs,
      boundariesMs[index] as number,
      startMs + minSlideMs,
      nextMs - minSlideMs,
    );
    if (snappedMs !== undefined) {
      boundariesMs[index] = snappedMs;
    }
  }
  return boundariesMs.map((endMs, index) => endMs - (boundariesMs[index - 1] ?? 0));
}

/** Where each slide ends, from the slideshow's start. */
function endsMs(durationsMs: readonly number[]): number[] {
  let elapsedMs = 0;
  return durationsMs.map((durationMs) => (elapsedMs += durationMs));
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
