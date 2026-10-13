import { MIN_SECONDS_PER_PICTURE, type StoredPicture } from "../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import { snapToBeats } from "./snap-to-beats";

const MIN_SLIDE_DURATION_MS = MIN_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;

/**
 * What the durations are computed from: a slide's own duration, if it has one, and its weight —
 * a composed portrait pair counts as `PAIR_WEIGHT` slides, a single picture as 1 (ADR-0028).
 */
export interface TimedPicture extends Pick<StoredPicture, "durationMs"> {
  /** Absent: 1, a single picture's weight. */
  readonly weight?: number;
}

const DEFAULT_WEIGHT = 1;

/**
 * The slide durations in play order. An own duration is kept exactly. The other slides show
 * `secondsPerPicture` each, scaled by weight, unless they fill the music: then they share the
 * rest of its excerpt by weight (the remainder going to the first of them so the sum matches
 * exactly). A share below `MIN_SECONDS_PER_PICTURE`, unweighted, is rejected in favour of the
 * minimum, so the slideshow outlasts a excerpt too short for it. With the playlist's beats, each
 * boundary ending an automatic slide then moves to the nearest beat (`snapToBeats`), and so does
 * the slideshow's end unless the pictures fill the music. See ADR-0008, ADR-0009, ADR-0021,
 * ADR-0022, ADR-0023 and ADR-0028.
 */
export function slideDurationsMs(
  pictures: readonly TimedPicture[],
  /** The length the pictures fill (`filledMusicMs`); absent: they last their seconds. */
  filledMs: number | undefined,
  secondsPerPicture: number,
  /** The beats to change on, in ms of the playlist (`playlistBeatsMs`); absent: none. */
  beatsMs?: readonly number[],
): number[] {
  if (pictures.length < 1) {
    throw new RangeError(`pictures: expected at least 1, got ${pictures.length}`);
  }
  const automaticWeights = pictures
    .filter((picture) => picture.durationMs === undefined)
    .map((picture) => picture.weight ?? DEFAULT_WEIGHT);
  const automaticMs =
    filledMs === undefined
      ? automaticWeights.map((weight) => secondsPerPicture * MILLISECONDS_PER_SECOND * weight)
      : evenSplitMs(automaticWeights, filledMs - ownTotalMs(pictures));
  let nextAutomatic = 0;
  // automaticMs holds exactly one entry per picture without an own duration.
  const durationsMs = pictures.map(
    (picture) => picture.durationMs ?? (automaticMs[nextAutomatic++] as number),
  );
  if (beatsMs === undefined) {
    return durationsMs;
  }
  const automatic = pictures.map((picture) => picture.durationMs === undefined);
  const endOnBeat = filledMs === undefined;
  return snapToBeats(durationsMs, automatic, beatsMs, MIN_SLIDE_DURATION_MS, endOnBeat);
}

function ownTotalMs(pictures: readonly TimedPicture[]): number {
  return pictures.reduce((sum, picture) => sum + (picture.durationMs ?? 0), 0);
}

/**
 * `restMs` shared in proportion to `weights`, the remainder of whole ms on the first slides so
 * the sum matches exactly; the minimum, unweighted, if a share would fall below it.
 */
function evenSplitMs(weights: readonly number[], restMs: number): number[] {
  if (weights.length === 0) {
    return [];
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const floorShares = weights.map((weight) => Math.floor((restMs * weight) / totalWeight));
  if (floorShares.some((share) => share < MIN_SLIDE_DURATION_MS)) {
    return weights.map(() => MIN_SLIDE_DURATION_MS);
  }
  let remainderMs = restMs - floorShares.reduce((sum, share) => sum + share, 0);
  return floorShares.map((share) => {
    if (remainderMs > 0) {
      remainderMs -= 1;
      return share + 1;
    }
    return share;
  });
}
