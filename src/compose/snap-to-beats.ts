/** Beats per phrase: a bar of four, so a change on a phrase start sits where the music turns. */
const BEATS_PER_PHRASE = 4;

/**
 * Moves the boundaries that end an automatic slide onto the music's beats (ADR-0021): each to the
 * nearest beat (preferring a phrase start, `nearestBeatMs`) that leaves its slide and the next automatic one at least `minSlideMs`, else where
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
 * (`TITLE_CARD_COMPOSITION.md`, Beats).
 */
export function snapToNextBeat(beatsMs: readonly number[] | undefined, minMs: number): number {
  const next = beatsMs?.find((beatMs) => beatMs >= minMs);
  return next ?? minMs;
}

function sum(durationsMs: readonly number[]): number {
  return durationsMs.reduce((total, durationMs) => total + durationMs, 0);
}

/**
 * The beat nearest `targetMs` from `earliestMs` to `latestMs`, the earlier one on a tie — but a
 * phrase start (every `BEATS_PER_PHRASE`th beat of the list) when the nearest one of those is at
 * most one beat further from the target.
 */
function nearestBeatMs(
  beatsMs: readonly number[],
  targetMs: number,
  earliestMs: number,
  latestMs: number,
): number | undefined {
  let nearest: number | undefined;
  let nearestPhrase: number | undefined;
  beatsMs.forEach((beatMs, index) => {
    if (beatMs < earliestMs || beatMs > latestMs) return;
    if (nearest === undefined || distance(beatMs, targetMs) < distance(nearest, targetMs)) {
      nearest = beatMs;
    }
    const startsPhrase = index % BEATS_PER_PHRASE === 0;
    if (
      startsPhrase &&
      (nearestPhrase === undefined ||
        distance(beatMs, targetMs) < distance(nearestPhrase, targetMs))
    ) {
      nearestPhrase = beatMs;
    }
  });
  if (nearest === undefined || nearestPhrase === undefined) return nearest;
  const oneBeatMs = ((beatsMs.at(-1) as number) - (beatsMs[0] as number)) / (beatsMs.length - 1);
  return distance(nearestPhrase, targetMs) <= distance(nearest, targetMs) + oneBeatMs / 2
    ? nearestPhrase
    : nearest;
}

function distance(aMs: number, bMs: number): number {
  return Math.abs(aMs - bMs);
}
