import { localWallTime, readExifCaptureDate } from "./exif-capture-date";
import { readExifGps, type ExifGps } from "./exif-gps";
import { readPictureHead } from "./unreadable-picture";

/** Enough of a file to hold the EXIF segment of any camera picture. */
const EXIF_SEARCH_BYTES = 128 * 1024;

/** What a picture file's EXIF tells the import: when it was taken and where, if anywhere. */
export interface PictureExif {
  readonly capturedAt: string;
  readonly gps: ExifGps | null;
}

/**
 * The capture date and GPS coordinate from one read of the file's head; the date falls back to
 * the file's modification time. A file the browser cannot read rejects with
 * `UnreadablePictureError`; a picture without EXIF does not.
 */
export async function readPictureExif(file: File): Promise<PictureExif> {
  const head = await readPictureHead(file, EXIF_SEARCH_BYTES);
  return {
    capturedAt: readExifCaptureDate(head) ?? localWallTime(new Date(file.lastModified)),
    gps: readExifGps(head),
  };
}
