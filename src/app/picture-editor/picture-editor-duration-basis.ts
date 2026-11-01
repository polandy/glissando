import { type SlideUnit, timedUnit, playlistMs } from "../../compose";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MIN_OWN_DURATION_MS } from "../../library/own-timing";

/** What an automatic duration follows: the slideshow's seconds per picture, or the music. */
export type DurationBasis =
  | { readonly kind: "seconds-per-picture"; readonly automaticMs: number }
  | {
      readonly kind: "music";
      /** The pictures without an own duration, sharing the rest of the music. */
      readonly automaticCount: number;
      /** What a single slide of them gets (a pair `PAIR_WEIGHT` times it); null when none. */
      readonly shareMs: number | null;
      /** The own durations use up the music; the automatic pictures get the minimum instead. */
      readonly clamped: boolean;
    };

/** A single slide's weight; a composed pair weighs `PAIR_WEIGHT`. */
const SINGLE_WEIGHT = 1;

export function durationBasis(
  stored: StoredSlideshow,
  units: readonly SlideUnit[],
  durationsMs: readonly number[],
  /** What the picture's slide would last with no own duration. */
  automaticMs: number,
): DurationBasis {
  const musicMs = playlistMs(stored);
  if (musicMs === undefined) {
    return { kind: "seconds-per-picture", automaticMs };
  }
  const automaticCount = stored.pictures.filter(
    ({ durationMs }) => durationMs === undefined,
  ).length;
  const automatic = units.flatMap((unit, slide) => {
    const { durationMs, weight = SINGLE_WEIGHT } = timedUnit(stored.pictures, unit);
    return durationMs === undefined ? [{ weight, durationMs: durationsMs[slide] as number }] : [];
  });
  if (automatic.length === 0) {
    return { kind: "music", automaticCount: 0, shareMs: null, clamped: false };
  }
  const ownTotalMs = sum(stored.pictures.map(({ durationMs }) => durationMs ?? 0));
  const totalWeight = sum(automatic.map(({ weight }) => weight));
  const lightestWeight = Math.min(...automatic.map(({ weight }) => weight));
  const lightestShareMs = Math.floor(((musicMs - ownTotalMs) * lightestWeight) / totalWeight);
  return {
    kind: "music",
    automaticCount,
    shareMs: sum(automatic.map(({ durationMs }) => durationMs)) / totalWeight,
    clamped: lightestShareMs < MIN_OWN_DURATION_MS,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
