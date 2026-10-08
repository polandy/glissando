/**
 * The capture date of a picture. EXIF stores the camera's wall-clock time without a zone, so
 * capture dates are wall times written with a "Z" suffix: an ISO date the slideshow format
 * accepts, ordered and titled as the user saw the clock, not a true UTC instant. The file-date
 * fallback follows the same convention with the device's local time.
 */

/** Enough of a file to hold the EXIF segment of any camera picture. */
export const EXIF_SEARCH_BYTES = 128 * 1024;

const JPEG_START_OF_IMAGE = 0xffd8;
const MARKER_PREFIX = 0xff;
const MARKER_APP1 = 0xe1;
const MARKER_START_OF_SCAN = 0xda;
const MARKER_END_OF_IMAGE = 0xd9;
const EXIF_HEADER = "Exif\0\0";
const TIFF_LITTLE_ENDIAN = 0x4949;
const TIFF_BIG_ENDIAN = 0x4d4d;
const TIFF_MAGIC = 42;
const IFD_ENTRY_LENGTH = 12;
const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TYPE_ASCII = 2;
/** "YYYY:MM:DD HH:MM:SS" */
const EXIF_DATE_LENGTH = 19;
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
/** Values up to four bytes sit in the entry itself, longer ones at an offset. */
const INLINE_VALUE_BYTES = 4;

/** The EXIF DateTimeOriginal of a JPEG as "YYYY-MM-DDTHH:MM:SSZ", or null; never throws. */
export function readExifCaptureDate(bytes: ArrayBuffer): string | null {
  const data = new DataView(bytes);
  const tiffStart = findExifTiffStart(data);
  return tiffStart === null ? null : readDateTimeOriginal(data, tiffStart);
}

/** EXIF date of the file's head, else its modification time (see the module comment). */
export async function captureDate(file: File): Promise<string> {
  const head = await file.slice(0, EXIF_SEARCH_BYTES).arrayBuffer();
  return readExifCaptureDate(head) ?? localWallTime(new Date(file.lastModified));
}

function localWallTime(date: Date): string {
  const two = (value: number) => String(value).padStart(2, "0");
  const day = `${String(date.getFullYear()).padStart(4, "0")}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
  return `${day}T${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}Z`;
}

function findExifTiffStart(data: DataView): number | null {
  if (readU16(data, 0, false) !== JPEG_START_OF_IMAGE) {
    return null;
  }
  let at = 2;
  while (at + 4 <= data.byteLength) {
    if (data.getUint8(at) !== MARKER_PREFIX) {
      return null;
    }
    const marker = data.getUint8(at + 1);
    if (marker === MARKER_START_OF_SCAN || marker === MARKER_END_OF_IMAGE) {
      return null;
    }
    // The length counts its own two bytes but not the marker.
    const segmentLength = data.getUint16(at + 2);
    const payload = at + 4;
    // A segment may run past the bytes read (a file's head); every later read is bounds-checked.
    if (segmentLength < 2) {
      return null;
    }
    if (marker === MARKER_APP1 && startsWithAscii(data, payload, EXIF_HEADER)) {
      return payload + EXIF_HEADER.length;
    }
    at += 2 + segmentLength;
  }
  return null;
}

function readDateTimeOriginal(data: DataView, tiffStart: number): string | null {
  const byteOrder = readU16(data, tiffStart, false);
  if (byteOrder !== TIFF_LITTLE_ENDIAN && byteOrder !== TIFF_BIG_ENDIAN) {
    return null;
  }
  const little = byteOrder === TIFF_LITTLE_ENDIAN;
  if (readU16(data, tiffStart + 2, little) !== TIFF_MAGIC) {
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

/** The position of the IFD entry with the given tag, or null. */
function findEntry(
  data: DataView,
  tiffStart: number,
  ifdOffset: number,
  tag: number,
  little: boolean,
): number | null {
  const ifd = tiffStart + ifdOffset;
  const entryCount = readU16(data, ifd, little);
  if (entryCount === null) {
    return null;
  }
  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifd + 2 + index * IFD_ENTRY_LENGTH;
    const entryTag = readU16(data, entry, little);
    if (entryTag === null || entry + IFD_ENTRY_LENGTH > data.byteLength) {
      return null;
    }
    if (entryTag === tag) {
      return entry;
    }
  }
  return null;
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

function readU16(data: DataView, at: number, little: boolean): number | null {
  return at >= 0 && at + 2 <= data.byteLength ? data.getUint16(at, little) : null;
}

function readU32(data: DataView, at: number, little: boolean): number | null {
  return at >= 0 && at + 4 <= data.byteLength ? data.getUint32(at, little) : null;
}

function readAscii(data: DataView, at: number, length: number): string | null {
  if (at < 0 || at + length > data.byteLength) {
    return null;
  }
  let text = "";
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(data.getUint8(at + index));
  }
  return text;
}

function startsWithAscii(data: DataView, at: number, prefix: string): boolean {
  return readAscii(data, at, prefix.length) === prefix;
}
