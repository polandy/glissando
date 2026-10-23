/** Beats per phrase: a bar of four, so a change on a phrase start sits where the music turns. */
export const BEATS_PER_PHRASE = 4;

/**
 * Moves slide boundaries onto the music's beats (ADR-0021): each one, automatic or an own
 * duration, to the nearest beat (preferring a phrase start, `nearestBeatMs`) that leaves this
 * slide and the next automatic one ahead at least `minSlideMs`. An own duration also keeps its
 * slide within its slack of that duration — half its length above the minimum — so it moves to
 * about its set length rather than exactly it. The difference absorbs into the next automatic
 * slide ahead, whose own boundary may then snap again in turn; a slide with an own duration in
 * between carries over unaffected, its own boundary decided separately on its own terms. With
 * `endOnBeat`, a slide with no automatic slide ahead to absorb into — the last automatic slide
 * when the pictures do not fill the music, or an own duration after it — still moves its own end
 * the same bounded way; otherwise it stays, and the sum of the durations does not change.
 */
export function snapToBeats(
  durationsMs: readonly number[],
  /** Per slide: whether its duration is automatic, and so may change without a slack limit. */
  automatic: readonly boolean[],
  /** In ms of the playlist, ascending. */
  beatsMs: readonly number[],
  minSlideMs: number,
  /** The last slide, if it has no automatic one ahead, may end on a beat too. */
  endOnBeat = false,
): number[] {
  const snappedMs = [...durationsMs];
  let startMs = 0;
  for (let index = 0; index < snappedMs.length; index += 1) {
    const nextAutomatic = automatic.indexOf(true, index + 1);
    if (nextAutomatic !== -1) {
      const durationMs = snappedMs[index] as number;
      const endMs = startMs + durationMs;
      const ownBetweenMs = sum(snappedMs.slice(index + 1, nextAutomatic));
      const nextEndMs = endMs + ownBetweenMs + (snappedMs[nextAutomatic] as number);
      const latestMs = Math.min(
        nextEndMs - ownBetweenMs - minSlideMs,
        automatic[index] ? Infinity : startMs + 2 * durationMs - minSlideMs,
      );
      const beatMs = nearestBeatMs(beatsMs, endMs, startMs + minSlideMs, latestMs);
      if (beatMs !== undefined) {
        snappedMs[index] = beatMs - startMs;
        snappedMs[nextAutomatic] = nextEndMs - beatMs - ownBetweenMs;
      }
    } else if (endOnBeat) {
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
