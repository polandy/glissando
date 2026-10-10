import { orderByCaptureDate } from "../compose/order-by-capture-date";
import type { StoredPicture } from "./stored-slideshow";

/** Where pictures added to a slideshow in its own order go (dev-docs/APP.md, Adding pictures). */
export type AddedPlacement = "byCaptureDate" | "atEnd";

export const DEFAULT_ADDED_PLACEMENT: AddedPlacement = "byCaptureDate";

/**
 * Sorts `added` into an own order: each goes right after the picture taken last no later than it
 * (the later one in play order on a tie), one older than all right before the oldest. Several at
 * one spot keep their capture order; the pictures already there keep theirs.
 */
export function placeByCaptureDate(
  pictures: readonly StoredPicture[],
  added: readonly StoredPicture[],
): StoredPicture[] {
  const times = pictures.map(({ capturedAt }) => Date.parse(capturedAt));
  const oldest = times.indexOf(Math.min(...times));
  const before = new Map<number, StoredPicture[]>();
  const after = new Map<number, StoredPicture[]>();
  for (const picture of orderByCaptureDate(added)) {
    const anchor = indexOfLatestTakenBy(times, Date.parse(picture.capturedAt));
    const [spots, index] = anchor === null ? [before, oldest] : [after, anchor];
    spots.set(index, [...(spots.get(index) ?? []), picture]);
  }
  const placed = pictures.flatMap((picture, index) => [
    ...(before.get(index) ?? []),
    picture,
    ...(after.get(index) ?? []),
  ]);
  return pictures.length === 0 ? orderByCaptureDate(added) : placed;
}

function indexOfLatestTakenBy(times: readonly number[], limit: number): number | null {
  let latest: number | null = null;
  times.forEach((time, index) => {
    if (time <= limit && (latest === null || time >= (times[latest] ?? time))) latest = index;
  });
  return latest;
}
