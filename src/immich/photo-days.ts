import type { ImmichPhoto } from "./immich-client";

export interface PhotoDay {
  /** `YYYY-MM-DD` of the photos' wall time. */
  readonly day: string;
  readonly photos: readonly ImmichPhoto[];
}

/** `takenAt` is wall time with a `Z` (see `ImmichPhoto`), so its date part is the local day. */
const DATE_PART_LENGTH = "YYYY-MM-DD".length;

/** Consecutive photos of one day, in the given order; a day split by other days repeats. */
export function groupByDay(photos: readonly ImmichPhoto[]): readonly PhotoDay[] {
  const days: { day: string; photos: ImmichPhoto[] }[] = [];
  for (const photo of photos) {
    const day = photo.takenAt.slice(0, DATE_PART_LENGTH);
    const last = days.at(-1);
    if (last?.day === day) {
      last.photos.push(photo);
    } else {
      days.push({ day, photos: [photo] });
    }
  }
  return days;
}
