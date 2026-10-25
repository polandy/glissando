import { realOffsetsMs, type InsertedTime } from "./inserted-time";

export { snapToNextBeat } from "./snap-to-next-beat";

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
 *
 * `inserted` is how much of a title card or chapter plays around each slide unit (`InsertedTime`)
 * — absent with neither. The beats are already in that real playlist time, so every bound and
 * target below is shifted by it; `durationsMs` and the snapped result stay the slides' own,
 * nominal lengths throughout.
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
  inserted?: InsertedTime,
): number[] {
  const snappedMs = [...durationsMs];
  const offsets = realOffsetsMs(inserted, durationsMs.length);
  let startMs = 0;
  for (let index = 0; index < snappedMs.length; index += 1) {
    const startOffsetMs = offsets.startMs[index] as number;
    const endOffsetMs = offsets.endMs[index] as number;
    const nextAutomatic = automatic.indexOf(true, index + 1);
    if (nextAutomatic !== -1) {
      const durationMs = snappedMs[index] as number;
      const endMs = startMs + durationMs + endOffsetMs;
      const ownBetweenMs = sum(snappedMs.slice(index + 1, nextAutomatic));
      const nextEndOffsetMs = offsets.endMs[nextAutomatic] as number;
      const nextEndMs =
        startMs +
        durationMs +
        ownBetweenMs +
        (snappedMs[nextAutomatic] as number) +
        nextEndOffsetMs;
      const latestMs = Math.min(
        nextEndMs - ownBetweenMs - minSlideMs + endOffsetMs - nextEndOffsetMs,
        automatic[index] ? Infinity : startMs + startOffsetMs + 2 * durationMs - minSlideMs,
      );
      const earliestMs = startMs + startOffsetMs + minSlideMs;
      const beatMs = nearestBeatMs(beatsMs, endMs, earliestMs, latestMs);
      if (beatMs !== undefined) {
        snappedMs[index] = beatMs - startMs - endOffsetMs;
        snappedMs[nextAutomatic] =
          nextEndMs - beatMs - ownBetweenMs + endOffsetMs - nextEndOffsetMs;
      }
    } else if (endOnBeat) {
      const durationMs = snappedMs[index] as number;
      const slackMs = durationMs - minSlideMs;
      const endMs = startMs + durationMs + endOffsetMs;
      const beatMs = nearestBeatMs(beatsMs, endMs, endMs - slackMs, endMs + slackMs);
      if (beatMs !== undefined) {
        snappedMs[index] = beatMs - startMs - endOffsetMs;
      }
    }
    startMs += snappedMs[index] as number;
  }
  return snappedMs;
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
