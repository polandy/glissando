import type { StoredPicture } from "../../library/stored-slideshow";

const capturedMs = (picture: StoredPicture): number => Date.parse(picture.capturedAt);

/** A group's shown pictures, kept or set aside, from the earliest to the latest. */
export function byCaptureTime(
  kept: StoredPicture | undefined,
  similar: readonly StoredPicture[],
): StoredPicture[] {
  return [...(kept === undefined ? [] : [kept]), ...similar].sort(
    (first, second) => capturedMs(first) - capturedMs(second),
  );
}

/** The picture captured last, or undefined for none. */
export function latestCaptured(pictures: readonly StoredPicture[]): StoredPicture | undefined {
  return pictures.reduce<StoredPicture | undefined>(
    (found, picture) =>
      found === undefined || capturedMs(picture) > capturedMs(found) ? picture : found,
    undefined,
  );
}
