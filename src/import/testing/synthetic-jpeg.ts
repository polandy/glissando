/** Builds the header of a JPEG whose EXIF holds a chosen DateTimeOriginal, byte by byte. */

export type ByteOrder = "little" | "big";

export interface SyntheticJpegOptions {
  readonly byteOrder: ByteOrder;
  /** "YYYY:MM:DD HH:MM:SS"; null leaves the tag out. */
  readonly dateTimeOriginal: string | null;
  /** A JFIF APP0 segment before the EXIF one, as many cameras write. */
  readonly withApp0?: boolean;
}

export interface SyntheticJpeg {
  readonly bytes: Uint8Array;
  /** Where the TIFF header starts, for tests that corrupt fields relative to it. */
  readonly tiffStart: number;
  /** Byte just past the date string, the shortest prefix that still holds it. */
  readonly dateEnd: number;
}

const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_EXPOSURE_TIME = 0x829a;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;
const IFD0_OFFSET = 8;
const IFD_WITH_ONE_ENTRY_LENGTH = 2 + 12 + 4;
export const EXIF_IFD_OFFSET = IFD0_OFFSET + IFD_WITH_ONE_ENTRY_LENGTH;
const DATE_OFFSET = EXIF_IFD_OFFSET + IFD_WITH_ONE_ENTRY_LENGTH;

export function syntheticJpeg(options: SyntheticJpegOptions): SyntheticJpeg {
  const little = options.byteOrder === "little";
  const tiff: number[] = [];
  const u16 = (value: number) =>
    tiff.push(...(little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff]));
  const u32 = (value: number) => {
    const bytes = [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
    tiff.push(...(little ? bytes.reverse() : bytes));
  };
  const entry = (tag: number, type: number, count: number, value: number) => {
    u16(tag);
    u16(type);
    u32(count);
    u32(value);
  };

  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]));
  u16(42);
  u32(IFD0_OFFSET);
  u16(1);
  entry(TAG_EXIF_IFD_POINTER, TYPE_LONG, 1, EXIF_IFD_OFFSET);
  u32(0);
  u16(1);
  const date = options.dateTimeOriginal;
  if (date === null) {
    entry(TAG_EXPOSURE_TIME, TYPE_RATIONAL, 1, DATE_OFFSET);
  } else {
    entry(TAG_DATE_TIME_ORIGINAL, TYPE_ASCII, date.length + 1, DATE_OFFSET);
  }
  u32(0);
  tiff.push(...ascii(date ?? "\0\0\0\0\0\0\0\0"), 0);

  const app0 = options.withApp0
    ? [0xff, 0xe0, 0x00, 0x10, ...ascii("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]
    : [];
  const exif = [...ascii("Exif"), 0, 0, ...tiff];
  const app1Length = exif.length + 2;
  const header = [0xff, 0xd8, ...app0, 0xff, 0xe1, app1Length >> 8, app1Length & 0xff];
  const tiffStart = header.length + 6;
  const bytes = [...header, ...exif, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9];
  return {
    bytes: Uint8Array.from(bytes),
    tiffStart,
    dateEnd: tiffStart + DATE_OFFSET + (date?.length ?? 0),
  };
}

function ascii(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0));
}
