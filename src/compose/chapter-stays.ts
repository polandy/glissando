import { greatCircleDistanceKm, type Place } from "../places/nearest-place";
import type { StoredPicture } from "../library/stored-slideshow";
import { showDays, type ShowDay } from "./chapter-days";

/**
 * Rule B, `TRIP_CHAPTERS.md`: a stay is a run of consecutive calendar days whose main place
 * stays within this radius of the stay's own place (its first placed day's main place). A day
 * trip that strays further starts a new stay, even if the show returns to the same place later.
 */
export const STAY_RADIUS_KM = 25;

export interface Stay {
  readonly startDay: number;
  readonly endDay: number;
  /** Undefined only when the whole show has no place data (then there is exactly one stay). */
  readonly place: Place | undefined;
  readonly firstPicture: StoredPicture;
}

interface OpenStay {
  readonly startDay: number;
  endDay: number;
  place: Place | undefined;
  readonly firstPicture: StoredPicture;
}

function closeStay(open: OpenStay): Stay {
  return {
    startDay: open.startDay,
    endDay: open.endDay,
    place: open.place,
    firstPicture: open.firstPicture,
  };
}

function firstPictureOf(day: ShowDay): StoredPicture | undefined {
  return day.pictures[0];
}

/** The show's stays, in order, from its pictures (chronological order, not play order). */
export function staysOf(pictures: readonly StoredPicture[]): readonly Stay[] {
  const days = showDays(pictures);
  const stays: Stay[] = [];
  let open: OpenStay | undefined;

  for (const day of days) {
    if (open === undefined) {
      open = {
        startDay: day.day,
        endDay: day.day,
        place: day.mainPlace,
        firstPicture: firstPictureOf(day) as StoredPicture,
      };
      continue;
    }
    if (day.mainPlace === undefined) {
      // A day with no placed pictures just continues whatever stay is already open.
      open.endDay = day.day;
      continue;
    }
    if (open.place === undefined) {
      // The open stay has no place yet (its days so far had none); this day sets it.
      open.place = day.mainPlace;
      open.endDay = day.day;
      continue;
    }
    const distanceKm = greatCircleDistanceKm(
      open.place.latitude,
      open.place.longitude,
      day.mainPlace.latitude,
      day.mainPlace.longitude,
    );
    if (distanceKm <= STAY_RADIUS_KM) {
      open.endDay = day.day;
      continue;
    }
    stays.push(closeStay(open));
    open = {
      startDay: day.day,
      endDay: day.day,
      place: day.mainPlace,
      firstPicture: firstPictureOf(day) as StoredPicture,
    };
  }

  if (open !== undefined) {
    stays.push(closeStay(open));
  }
  return stays;
}
