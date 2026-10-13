import type { PortraitPictures } from "../library/portrait-pictures";
import type { StoredPicture } from "../library/stored-slideshow";
import type { TimedPicture } from "./slide-durations-ms";

/**
 * Groups pictures, in play order, into the slides they compose into (ADR-0028): a slide unit
 * holds one picture, or two paired portrait pictures. Pairing never reorders.
 */

/** A pair lasts this many times a single slide's share of fixed seconds or filled music. */
export const PAIR_WEIGHT = 1.5;

export interface SlideUnit {
  readonly pictureIndices: readonly [number] | readonly [number, number];
}

/**
 * The slide units for `pictures`. With `portraitPictures` set (not automatic), every picture is
 * single. Automatic pairs two consecutive pictures that are both portrait and have none of a
 * caption, own motion, duration or transition, and are not marked `alone`.
 */
export function slideUnits(
  pictures: readonly StoredPicture[],
  portraitPictures: PortraitPictures | undefined,
): readonly SlideUnit[] {
  const units: SlideUnit[] = [];
  let index = 0;
  while (index < pictures.length) {
    const current = pictures[index] as StoredPicture;
    const next = pictures[index + 1];
    if (
      portraitPictures === undefined &&
      next !== undefined &&
      pairable(current) &&
      pairable(next)
    ) {
      units.push({ pictureIndices: [index, index + 1] });
      index += 2;
    } else {
      units.push({ pictureIndices: [index] });
      index += 1;
    }
  }
  return units;
}

/** The slide index that holds `pictureIndex`; throws `RangeError` when none does. */
export function slideOfPicture(units: readonly SlideUnit[], pictureIndex: number): number {
  const slideIndex = units.findIndex((unit) =>
    (unit.pictureIndices as readonly number[]).includes(pictureIndex),
  );
  if (slideIndex < 0) {
    throw new RangeError(`pictureIndex: no slide holds picture ${pictureIndex}`);
  }
  return slideIndex;
}

/** A paired slide is always automatic; a single one keeps its picture's own duration, if any. */
export function timedUnit(pictures: readonly StoredPicture[], unit: SlideUnit): TimedPicture {
  if (unit.pictureIndices.length === 2) {
    return { weight: PAIR_WEIGHT };
  }
  const [firstIndex] = unit.pictureIndices;
  const durationMs = (pictures[firstIndex] as StoredPicture).durationMs;
  return durationMs === undefined ? {} : { durationMs };
}

function pairable(picture: StoredPicture): boolean {
  return (
    picture.height > picture.width &&
    picture.kenBurns === undefined &&
    picture.caption === undefined &&
    picture.durationMs === undefined &&
    picture.transition === undefined &&
    picture.alone !== true
  );
}
