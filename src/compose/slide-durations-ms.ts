import { MIN_SECONDS_PER_PICTURE, type StoredPicture } from "../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import { cutAtLifts } from "./energy/cut-at-lifts";
import { paceByEnergy } from "./energy/pace-by-energy";
import type { PlaylistEnergy } from "./energy/playlist-energy";
import { shareByWeightMs } from "./share-by-weight";
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
 * The slide durations in play order. An own duration keeps that length; the other slides show
 * `secondsPerPicture` each, scaled by weight, unless they fill the music: then they share the
 * rest of its excerpt by weight (the remainder going to the first of them so the sum matches
 * exactly). A share below `MIN_SECONDS_PER_PICTURE`, unweighted, is rejected in favour of the
 * minimum, so the slideshow outlasts a excerpt too short for it. With the playlist's beats, each
 * boundary then moves to the nearest beat (`snapToBeats`), an own duration only to about its set
 * length; the slideshow's end moves too unless the pictures fill the music. With the playlist's
 * energy, the automatic durations are re-paced by it first, then cut at its lifts, before beats
 * are considered (`paceByEnergy`, `cutAtLifts`; ADR-0046). See ADR-0008, ADR-0009, ADR-0021,
 * ADR-0022, ADR-0023 and ADR-0028.
 */
export function slideDurationsMs(
  pictures: readonly TimedPicture[],
  /** The length the pictures fill (`filledMusicMs`); absent: they last their seconds. */
  filledMs: number | undefined,
  secondsPerPicture: number,
  /** The beats to change on, in ms of the playlist (`playlistBeatsMs`); absent: none. */
  beatsMs?: readonly number[],
  /** The playlist's energy and lifts (`playlistEnergy`); absent: the usual durations stand. */
  energy?: PlaylistEnergy,
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
  const usualMs = pictures.map(
    (picture) => picture.durationMs ?? (automaticMs[nextAutomatic++] as number),
  );
  const automatic = pictures.map((picture) => picture.durationMs === undefined);
  const durationsMs =
    energy === undefined
      ? usualMs
      : cutAtLifts(
          paceByEnergy(usualMs, automatic, energy, MIN_SLIDE_DURATION_MS),
          automatic,
          energy.liftsMs,
          MIN_SLIDE_DURATION_MS,
        );
  if (beatsMs === undefined) {
    return durationsMs;
  }
  // Filling the music does not pin the end when there is no automatic slide to fill it with.
  const endOnBeat = filledMs === undefined || automaticWeights.length === 0;
  return snapToBeats(durationsMs, automatic, beatsMs, MIN_SLIDE_DURATION_MS, endOnBeat);
}

function ownTotalMs(pictures: readonly TimedPicture[]): number {
  return pictures.reduce((sum, picture) => sum + (picture.durationMs ?? 0), 0);
}

/**
 * `restMs` shared in proportion to `weights` (`shareByWeightMs`); the minimum, unweighted, if a
 * share would floor below it.
 */
function evenSplitMs(weights: readonly number[], restMs: number): number[] {
  if (weights.length === 0) {
    return [];
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const anyFloorsBelowMinimum = weights.some(
    (weight) => Math.floor((restMs * weight) / totalWeight) < MIN_SLIDE_DURATION_MS,
  );
  if (anyFloorsBelowMinimum) {
    return weights.map(() => MIN_SLIDE_DURATION_MS);
  }
  return shareByWeightMs(weights, restMs);
}
