import type { StoredPicture } from "../library/stored-slideshow";

/**
 * Ascending by capture date; a tie (same instant, e.g. a burst) breaks by file name, and a tie
 * on both keeps the input order, so the result is reproducible from the same import.
 */
export function orderByCaptureDate(pictures: readonly StoredPicture[]): StoredPicture[] {
  return pictures
    .map((picture, index) => ({ picture, index }))
    .sort((a, b) => {
      const byCapturedAt = Date.parse(a.picture.capturedAt) - Date.parse(b.picture.capturedAt);
      if (byCapturedAt !== 0) {
        return byCapturedAt;
      }
      if (a.picture.fileName !== b.picture.fileName) {
        return a.picture.fileName < b.picture.fileName ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ picture }) => picture);
}
