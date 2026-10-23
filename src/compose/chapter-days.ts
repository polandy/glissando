import type { Place } from "../places/nearest-place";
import type { StoredPicture } from "../library/stored-slideshow";

/**
 * A picture's calendar day within the show (Rule A, `TRIP_CHAPTERS.md`): the wall-clock date of
 * its `capturedAt` (stored with a fake "Z", read with UTC getters), day 1 being the show's
 * earliest one. A calendar day with no picture still counts, so a gap does not renumber the days
 * after it.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The UTC calendar date `capturedAt` falls on, as a day index comparable across pictures. */
function utcDayIndex(capturedAt: string): number {
  const date = new Date(capturedAt);
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY,
  );
}

/** The show's earliest calendar day, by capture date — not by play order (ADR for ownOrder). */
function earliestDayIndex(pictures: readonly StoredPicture[]): number {
  return Math.min(...pictures.map((picture) => utcDayIndex(picture.capturedAt)));
}

export interface DayNumberedPicture {
  readonly picture: StoredPicture;
  readonly day: number;
}

/** Each picture with its calendar day number (Rule A); empty for no pictures. */
export function dayNumbersOf(pictures: readonly StoredPicture[]): readonly DayNumberedPicture[] {
  if (pictures.length === 0) {
    return [];
  }
  const firstDay = earliestDayIndex(pictures);
  return pictures.map((picture) => ({
    picture,
    day: utcDayIndex(picture.capturedAt) - firstDay + 1,
  }));
}

/** The calendar date (UTC midnight) of `day`, counted from the show's earliest picture. */
export function dateOfDay(pictures: readonly StoredPicture[], day: number): Date {
  if (pictures.length === 0) {
    throw new RangeError("pictures: expected at least one picture");
  }
  const firstDay = earliestDayIndex(pictures);
  return new Date((firstDay + day - 1) * MS_PER_DAY);
}

/** One calendar day of the show. */
export interface ShowDay {
  readonly day: number;
  readonly pictures: readonly StoredPicture[];
  /** The most common place among this day's pictures, ties going to the first appearing one. */
  readonly mainPlace: Place | undefined;
}

/**
 * Every calendar day from 1 to the show's last, in order — a day with no picture still appears,
 * empty (Rule A: gaps count). `pictures` is read in the order given, which the main-place tie
 * break follows as "first appearing".
 */
export function showDays(pictures: readonly StoredPicture[]): readonly ShowDay[] {
  const numbered = dayNumbersOf(pictures);
  const lastDay = numbered.reduce((max, { day }) => Math.max(max, day), 0);
  const byDay = new Map<number, StoredPicture[]>();
  for (const { picture, day } of numbered) {
    const dayPictures = byDay.get(day);
    if (dayPictures) {
      dayPictures.push(picture);
    } else {
      byDay.set(day, [picture]);
    }
  }
  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const dayPictures = byDay.get(day) ?? [];
    return { day, pictures: dayPictures, mainPlace: mainPlaceOf(dayPictures) };
  });
}

/** Rule B's main place: the most common place name, ties going to the first appearing picture. */
function mainPlaceOf(pictures: readonly StoredPicture[]): Place | undefined {
  const placed = pictures.filter((picture) => picture.place !== undefined);
  if (placed.length === 0) {
    return undefined;
  }
  const counts = new Map<string, { readonly place: Place; count: number }>();
  for (const picture of placed) {
    const place = picture.place as Place;
    const entry = counts.get(place.name);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(place.name, { place, count: 1 });
    }
  }
  let best: { readonly place: Place; readonly count: number } | undefined;
  for (const picture of placed) {
    const name = (picture.place as Place).name;
    const entry = counts.get(name) as { readonly place: Place; readonly count: number };
    if (best === undefined || entry.count > best.count) {
      best = entry;
    }
  }
  return best?.place;
}
