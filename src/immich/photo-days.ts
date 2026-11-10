import type { ImmichPhoto } from "./immich-client";

export interface PhotoDay {
  /** `YYYY-MM-DD` of the photos' wall time. */
  readonly day: string;
  readonly photos: readonly ImmichPhoto[];
  /** How many of the day's images are left out because they are not JPEGs. */
  readonly hidden: number;
}

/** `takenAt` is wall time with a `Z` (see `ImmichPhoto`), so its date part is the local day. */
const DATE_PART_LENGTH = "YYYY-MM-DD".length;

/**
 * Consecutive photos of one day, in the given order; a day split by other days repeats. A hidden
 * asset counts on the day of its `takenAt`; a day with no listed photo gets no group.
 */
export function groupByDay(
  photos: readonly ImmichPhoto[],
  hiddenTakenAt: readonly string[] = [],
): readonly PhotoDay[] {
  const hiddenByDay = new Map<string, number>();
  for (const takenAt of hiddenTakenAt) {
    const day = takenAt.slice(0, DATE_PART_LENGTH);
    hiddenByDay.set(day, (hiddenByDay.get(day) ?? 0) + 1);
  }
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
  return days.map((group) => ({ ...group, hidden: hiddenByDay.get(group.day) ?? 0 }));
}
