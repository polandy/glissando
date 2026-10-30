/** Builds a JPEG's APP1/EXIF/TIFF bytes with a hand-assembled IFD0, Exif IFD and GPS IFD. */

import type { ByteOrder } from "./synthetic-jpeg";

export type { ByteOrder };

export interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

export const rational = (numerator: number, denominator: number): Rational => ({
  numerator,
  denominator,
});

export const TAG_GPS_LATITUDE_REF = 0x0001;
export const TAG_GPS_LATITUDE = 0x0002;
export const TAG_GPS_LONGITUDE_REF = 0x0003;
export const TAG_GPS_LONGITUDE = 0x0004;

const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_GPS_IFD_POINTER = 0x8825;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;

export type GpsIfdEntry =
  | { readonly tag: number; readonly kind: "ref"; readonly ref: string }
  | {
      readonly tag: number;
      readonly kind: "coordinate";
      readonly degrees: Rational;
      readonly minutes: Rational;
      readonly seconds: Rational;
    };

export const gpsRef = (tag: number, ref: string) => ({ tag, kind: "ref" as const, ref });
export const gpsCoordinate = (
  tag: number,
  degrees: Rational,
  minutes: Rational,
  seconds: Rational,
) => ({ tag, kind: "coordinate" as const, degrees, minutes, seconds });

/** The decimal value a reader must produce from a degrees/minutes/seconds triplet. */
export function decimalDegrees(degrees: Rational, minutes: Rational, seconds: Rational): number {
  return (
    degrees.numerator / degrees.denominator +
    minutes.numerator / minutes.denominator / 60 +
    seconds.numerator / seconds.denominator / 3600
  );
}

export interface SyntheticGpsJpegOptions {
  readonly byteOrder: ByteOrder;
  /** "YYYY:MM:DD HH:MM:SS"; omitted leaves the Exif IFD (and the date tag) out entirely. */
  readonly exifDateTimeOriginal?: string;
  /** null omits the GPS IFD pointer itself (no GPS data at all); otherwise its entries. */
  readonly gpsIfd: readonly GpsIfdEntry[] | null;
}

export function syntheticGpsJpeg(options: SyntheticGpsJpegOptions): Uint8Array {
  const little = options.byteOrder === "little";
  const dateTimeOriginal = options.exifDateTimeOriginal ?? null;
  const gpsEntries = options.gpsIfd;

  const push16 = (bytes: number[], value: number) =>
    bytes.push(...(little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff]));
  const push32 = (bytes: number[], value: number) => {
    const big = [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
    bytes.push(...(little ? big.reverse() : big));
  };
  const pushEntry = (bytes: number[], tag: number, type: number, count: number, value: number) => {
    push16(bytes, tag);
    push16(bytes, type);
    push32(bytes, count);
    push32(bytes, value);
  };
  // An inline ASCII value is a byte string, left-justified in the entry — never byte-swapped.
  const pushInlineAsciiEntry = (
    bytes: number[],
    tag: number,
    count: number,
    firstCharCode: number,
  ) => {
    push16(bytes, tag);
    push16(bytes, TYPE_ASCII);
    push32(bytes, count);
    bytes.push(firstCharCode, 0, 0, 0);
  };
  const pushRational = (bytes: number[], value: Rational) => {
    push32(bytes, value.numerator);
    push32(bytes, value.denominator);
  };

  const IFD_HEADER_BYTES = 2;
  const IFD_FOOTER_BYTES = 4;
  const ENTRY_BYTES = 12;
  const RATIONAL_SET_BYTES = 24;
  const TIFF_HEADER_BYTES = 8;
  const IFD0_OFFSET = TIFF_HEADER_BYTES;

  const hasExifIfd = dateTimeOriginal !== null;
  const hasGpsIfd = gpsEntries !== null;

  const ifd0EntryCount = (hasExifIfd ? 1 : 0) + (hasGpsIfd ? 1 : 0);
  const ifd0Size = IFD_HEADER_BYTES + ifd0EntryCount * ENTRY_BYTES + IFD_FOOTER_BYTES;
  const exifIfdOffset = IFD0_OFFSET + ifd0Size;
  const exifIfdSize = hasExifIfd ? IFD_HEADER_BYTES + ENTRY_BYTES + IFD_FOOTER_BYTES : 0;
  const gpsIfdOffset = exifIfdOffset + exifIfdSize;
  const gpsIfdEntryCount = gpsEntries?.length ?? 0;
  const gpsIfdSize = hasGpsIfd
    ? IFD_HEADER_BYTES + gpsIfdEntryCount * ENTRY_BYTES + IFD_FOOTER_BYTES
    : 0;

  let externalOffset = gpsIfdOffset + gpsIfdSize;
  const coordinateOffsets = new Map<number, number>();
  for (const entry of gpsEntries ?? []) {
    if (entry.kind === "coordinate") {
      coordinateOffsets.set(entry.tag, externalOffset);
      externalOffset += RATIONAL_SET_BYTES;
    }
  }
  const exifDateOffset = externalOffset;

  const tiff: number[] = [];
  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]));
  push16(tiff, 42);
  push32(tiff, IFD0_OFFSET);

  push16(tiff, ifd0EntryCount);
  if (hasExifIfd) {
    pushEntry(tiff, TAG_EXIF_IFD_POINTER, TYPE_LONG, 1, exifIfdOffset);
  }
  if (hasGpsIfd) {
    pushEntry(tiff, TAG_GPS_IFD_POINTER, TYPE_LONG, 1, gpsIfdOffset);
  }
  push32(tiff, 0);

  if (hasExifIfd && dateTimeOriginal !== null) {
    push16(tiff, 1);
    pushEntry(
      tiff,
      TAG_DATE_TIME_ORIGINAL,
      TYPE_ASCII,
      dateTimeOriginal.length + 1,
      exifDateOffset,
    );
    push32(tiff, 0);
  }

  if (hasGpsIfd && gpsEntries !== null) {
    push16(tiff, gpsIfdEntryCount);
    for (const entry of gpsEntries) {
      if (entry.kind === "ref") {
        pushInlineAsciiEntry(tiff, entry.tag, 2, entry.ref.charCodeAt(0));
      } else {
        const offset = coordinateOffsets.get(entry.tag);
        if (offset === undefined) {
          throw new Error(`no external offset assigned for tag ${entry.tag}`);
        }
        pushEntry(tiff, entry.tag, TYPE_RATIONAL, 3, offset);
      }
    }
    push32(tiff, 0);
  }

  for (const entry of gpsEntries ?? []) {
    if (entry.kind === "coordinate") {
      pushRational(tiff, entry.degrees);
      pushRational(tiff, entry.minutes);
      pushRational(tiff, entry.seconds);
    }
  }

  if (dateTimeOriginal !== null) {
    tiff.push(...[...dateTimeOriginal].map((character) => character.charCodeAt(0)), 0);
  }

  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const app1Length = exif.length + 2;
  const header = [0xff, 0xd8, 0xff, 0xe1, app1Length >> 8, app1Length & 0xff];
  const bytes = [...header, ...exif, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9];
  return Uint8Array.from(bytes);
}
