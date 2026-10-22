import { readPictureHead } from "./unreadable-picture";
import {
  findEntry,
  findExifTiffStart,
  readAscii,
  readTiffByteOrder,
  readU16,
  readU32,
  INLINE_VALUE_BYTES,
  TAG_EXIF_IFD_POINTER,
  TYPE_ASCII,
} from "./exif-ifd";

/**
 * The capture date of a picture. EXIF stores the camera's wall-clock time without a zone, so
 * capture dates are wall times written with a "Z" suffix: an ISO date the slideshow format
 * accepts, ordered and titled as the user saw the clock, not a true UTC instant. The file-date
 * fallback follows the same convention with the device's local time.
 */

/** Enough of a file to hold the EXIF segment of any camera picture. */
export const EXIF_SEARCH_BYTES = 128 * 1024;

const TAG_DATE_TIME_ORIGINAL = 0x9003;
/** "YYYY:MM:DD HH:MM:SS" */
const EXIF_DATE_LENGTH = 19;
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/** The EXIF DateTimeOriginal of a JPEG as "YYYY-MM-DDTHH:MM:SSZ", or null; never throws. */
export function readExifCaptureDate(bytes: ArrayBuffer): string | null {
  const data = new DataView(bytes);
  const tiffStart = findExifTiffStart(data);
  return tiffStart === null ? null : readDateTimeOriginal(data, tiffStart);
}

/** EXIF date of the file's head, else its modification time (see the module comment). */
export async function captureDate(file: File): Promise<string> {
  const head = await readPictureHead(file, EXIF_SEARCH_BYTES);
  return readExifCaptureDate(head) ?? localWallTime(new Date(file.lastModified));
}

export function localWallTime(date: Date): string {
  const two = (value: number) => String(value).padStart(2, "0");
  const day = `${String(date.getFullYear()).padStart(4, "0")}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
  return `${day}T${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}Z`;
}

function readDateTimeOriginal(data: DataView, tiffStart: number): string | null {
  const little = readTiffByteOrder(data, tiffStart);
  if (little === null) {
    return null;
  }
  const ifd0 = readU32(data, tiffStart + 4, little);
  const exifIfdEntry =
    ifd0 === null ? null : findEntry(data, tiffStart, ifd0, TAG_EXIF_IFD_POINTER, little);
  const exifIfd = exifIfdEntry === null ? null : readU32(data, exifIfdEntry + 8, little);
  const dateEntry =
    exifIfd === null ? null : findEntry(data, tiffStart, exifIfd, TAG_DATE_TIME_ORIGINAL, little);
  if (dateEntry === null || readU16(data, dateEntry + 2, little) !== TYPE_ASCII) {
    return null;
  }
  const count = readU32(data, dateEntry + 4, little);
  if (count === null || count < EXIF_DATE_LENGTH || count <= INLINE_VALUE_BYTES) {
    return null;
  }
  const dateOffset = readU32(data, dateEntry + 8, little);
  return dateOffset === null
    ? null
    : toIsoDate(readAscii(data, tiffStart + dateOffset, EXIF_DATE_LENGTH));
}

function toIsoDate(exifDate: string | null): string | null {
  const parts = exifDate === null ? null : EXIF_DATE.exec(exifDate);
  if (parts === null) {
    return null;
  }
  const [, year, month, day, hours, minutes, seconds] = parts;
  const iso = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  const instant = Date.parse(iso);
  // A round trip rejects dates that do not exist (month 13, February 30, hour 24, year 0).
  const valid =
    !Number.isNaN(instant) && new Date(instant).toISOString() === iso.replace("Z", ".000Z");
  return valid && year !== "0000" ? iso : null;
}
