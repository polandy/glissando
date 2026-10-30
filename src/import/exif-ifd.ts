/**
 * TIFF/IFD plumbing shared by every EXIF reader: locating the TIFF block inside a JPEG's APP1
 * segment, and walking an Image File Directory to find a tag's entry. Each reader (capture date,
 * GPS, …) decodes its own tags' values from the entry this module hands back.
 */

const JPEG_START_OF_IMAGE = 0xffd8;
const MARKER_PREFIX = 0xff;
const MARKER_APP1 = 0xe1;
const MARKER_START_OF_SCAN = 0xda;
const MARKER_END_OF_IMAGE = 0xd9;
const EXIF_HEADER = "Exif\0\0";
const TIFF_LITTLE_ENDIAN = 0x4949;
const TIFF_BIG_ENDIAN = 0x4d4d;
const TIFF_MAGIC = 42;

/** Byte length of one IFD entry: tag(2) + type(2) + count(4) + value-or-offset(4). */
export const IFD_ENTRY_LENGTH = 12;

/** Values up to four bytes sit in the entry itself, longer ones at an offset. */
export const INLINE_VALUE_BYTES = 4;

/** IFD0 tag pointing at the Exif IFD, where the camera-specific tags (e.g. the capture date) live. */
export const TAG_EXIF_IFD_POINTER = 0x8769;

/** EXIF value type for a null-terminated ASCII string. */
export const TYPE_ASCII = 2;

/** The offset of a JPEG's TIFF block (the bytes right after the "Exif\0\0" header), or null. */
export function findExifTiffStart(data: DataView): number | null {
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

/** Whether the TIFF block at `tiffStart` is little-endian, big-endian (false) or invalid (null). */
export function readTiffByteOrder(data: DataView, tiffStart: number): boolean | null {
  const byteOrderMark = readU16(data, tiffStart, false);
  if (byteOrderMark !== TIFF_LITTLE_ENDIAN && byteOrderMark !== TIFF_BIG_ENDIAN) {
    return null;
  }
  const little = byteOrderMark === TIFF_LITTLE_ENDIAN;
  return readU16(data, tiffStart + 2, little) === TIFF_MAGIC ? little : null;
}

/** The position of the IFD entry with the given tag, or null. */
export function findEntry(
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

export function readU16(data: DataView, at: number, little: boolean): number | null {
  return at >= 0 && at + 2 <= data.byteLength ? data.getUint16(at, little) : null;
}

export function readU32(data: DataView, at: number, little: boolean): number | null {
  return at >= 0 && at + 4 <= data.byteLength ? data.getUint32(at, little) : null;
}

export function readAscii(data: DataView, at: number, length: number): string | null {
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
