/**
 * Moves the boundaries that end an automatic slide onto the music's beats (ADR-0021): each to the
 * nearest beat that leaves its slide and the next automatic one at least `minSlideMs`, else where
 * it was. Pictures with an own duration between the two move along and stay exact, so the boundary
 * after them is not snapped. With `endOnBeat` the last automatic slide's end moves too, to the
 * nearest beat as far from it as the slide's slack above the minimum, and the own durations after
 * it follow; otherwise it stays, and the sum of the durations does not change.
 */
export function snapToBeats(
  durationsMs: readonly number[],
  /** Per slide: whether its duration is automatic, and so may change. */
  automatic: readonly boolean[],
  /** In ms of the playlist, ascending. */
  beatsMs: readonly number[],
  minSlideMs: number,
  /** The last automatic slide may end on a beat: the pictures do not fill the music. */
  endOnBeat = false,
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
    } else if (automatic[index] && endOnBeat) {
      const durationMs = snappedMs[index] as number;
      const slackMs = durationMs - minSlideMs;
      const endMs = startMs + durationMs;
      const beatMs = nearestBeatMs(beatsMs, endMs, endMs - slackMs, endMs + slackMs);
      if (beatMs !== undefined) {
        snappedMs[index] = beatMs - startMs;
      }
    }
    startMs += snappedMs[index] as number;
  }
  return snappedMs;
}

/**
 * The beat at or after `minMs`, else `minMs` itself: without beats, or none reaches that far
 * (`TITLE_CARDS.md` § Composition, Beats).
 */
export function snapToNextBeat(beatsMs: readonly number[] | undefined, minMs: number): number {
  const next = beatsMs?.find((beatMs) => beatMs >= minMs);
  return next ?? minMs;
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
