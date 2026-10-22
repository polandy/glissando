import { describe, expect, it } from "vitest";
import {
  captureGps,
  readExifGps,
  MAX_LATITUDE,
  MAX_LONGITUDE,
  MIN_LATITUDE,
  MIN_LONGITUDE,
  type ExifGps,
} from "./exif-gps";

type ByteOrder = "little" | "big";

interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

const rational = (numerator: number, denominator: number): Rational => ({
  numerator,
  denominator,
});

type GpsIfdEntry =
  | { readonly tag: number; readonly kind: "ref"; readonly ref: string }
  | {
      readonly tag: number;
      readonly kind: "coordinate";
      readonly degrees: Rational;
      readonly minutes: Rational;
      readonly seconds: Rational;
    };

const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_GPS_IFD_POINTER = 0x8825;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_GPS_LATITUDE_REF = 0x0001;
const TAG_GPS_LATITUDE = 0x0002;
const TAG_GPS_LONGITUDE_REF = 0x0003;
const TAG_GPS_LONGITUDE = 0x0004;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;

const gpsRef = (tag: number, ref: string) => ({ tag, kind: "ref" as const, ref });
const gpsCoordinate = (tag: number, degrees: Rational, minutes: Rational, seconds: Rational) => ({
  tag,
  kind: "coordinate" as const,
  degrees,
  minutes,
  seconds,
});

/** The decimal value a reader must produce from a degrees/minutes/seconds triplet. */
function decimalDegrees(degrees: Rational, minutes: Rational, seconds: Rational): number {
  return (
    degrees.numerator / degrees.denominator +
    minutes.numerator / minutes.denominator / 60 +
    seconds.numerator / seconds.denominator / 3600
  );
}

interface GpsJpegOptions {
  readonly byteOrder: ByteOrder;
  /** "YYYY:MM:DD HH:MM:SS"; omitted leaves the Exif IFD (and the date tag) out entirely. */
  readonly exifDateTimeOriginal?: string;
  /** null omits the GPS IFD pointer itself (no GPS data at all); otherwise its entries. */
  readonly gpsIfd: readonly GpsIfdEntry[] | null;
}

/** Builds a JPEG's APP1/EXIF/TIFF bytes with a hand-assembled IFD0, Exif IFD and GPS IFD. */
function buildGpsJpeg(options: GpsJpegOptions): Uint8Array {
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

const buffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer;

const NORTH_LATITUDE = gpsCoordinate(
  TAG_GPS_LATITUDE,
  rational(10, 1),
  rational(30, 1),
  rational(0, 1),
);
const EAST_LONGITUDE = gpsCoordinate(
  TAG_GPS_LONGITUDE,
  rational(20, 1),
  rational(15, 1),
  rational(0, 1),
);
const SOUTH_LATITUDE = gpsCoordinate(
  TAG_GPS_LATITUDE,
  rational(33, 1),
  rational(45, 1),
  rational(0, 1),
);
const WEST_LONGITUDE = gpsCoordinate(
  TAG_GPS_LONGITUDE,
  rational(70, 1),
  rational(30, 1),
  rational(0, 1),
);

describe("readExifGps", () => {
  it.each<ByteOrder>(["little", "big"])(
    "reads a northern, eastern coordinate from %s-endian EXIF unchanged",
    (byteOrder) => {
      const jpeg = buildGpsJpeg({
        byteOrder,
        gpsIfd: [
          gpsRef(TAG_GPS_LATITUDE_REF, "N"),
          NORTH_LATITUDE,
          gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
          EAST_LONGITUDE,
        ],
      });

      const expected: ExifGps = {
        latitude: decimalDegrees(
          NORTH_LATITUDE.degrees,
          NORTH_LATITUDE.minutes,
          NORTH_LATITUDE.seconds,
        ),
        longitude: decimalDegrees(
          EAST_LONGITUDE.degrees,
          EAST_LONGITUDE.minutes,
          EAST_LONGITUDE.seconds,
        ),
      };
      expect(readExifGps(buffer(jpeg))).toEqual(expected);
    },
  );

  it("a southern, western coordinate is negated", () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "big",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "S"),
        SOUTH_LATITUDE,
        gpsRef(TAG_GPS_LONGITUDE_REF, "W"),
        WEST_LONGITUDE,
      ],
    });

    expect(readExifGps(buffer(jpeg))).toEqual({
      latitude: -decimalDegrees(
        SOUTH_LATITUDE.degrees,
        SOUTH_LATITUDE.minutes,
        SOUTH_LATITUDE.seconds,
      ),
      longitude: -decimalDegrees(
        WEST_LONGITUDE.degrees,
        WEST_LONGITUDE.minutes,
        WEST_LONGITUDE.seconds,
      ),
    });
  });

  it("returns null when there is no GPS IFD pointer at all", () => {
    const jpeg = buildGpsJpeg({ byteOrder: "little", gpsIfd: null });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it("returns null when the GPS IFD is missing one of the four required tags", () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "little",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "N"),
        NORTH_LATITUDE,
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        // GPSLongitude itself is left out.
      ],
    });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it("returns null for a ref character that is neither N/S nor E/W", () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "little",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "X"),
        NORTH_LATITUDE,
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        EAST_LONGITUDE,
      ],
    });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it("returns null when a rational's denominator is 0", () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "little",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "N"),
        gpsCoordinate(TAG_GPS_LATITUDE, rational(10, 1), rational(30, 1), rational(1, 0)),
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        EAST_LONGITUDE,
      ],
    });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it("returns null for the 0/0 sentinel some cameras write for no GPS data", () => {
    const zero = rational(0, 1);
    const jpeg = buildGpsJpeg({
      byteOrder: "little",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "N"),
        gpsCoordinate(TAG_GPS_LATITUDE, zero, zero, zero),
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        gpsCoordinate(TAG_GPS_LONGITUDE, zero, zero, zero),
      ],
    });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it("returns null when a coordinate is out of range", () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "little",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "N"),
        gpsCoordinate(TAG_GPS_LATITUDE, rational(95, 1), rational(0, 1), rational(0, 1)),
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        EAST_LONGITUDE,
      ],
    });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it.each([
    ["an empty file", new Uint8Array()],
    ["a PNG", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["a JPEG without EXIF", Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])],
  ])("returns null for %s", (_, bytes) => {
    expect(readExifGps(buffer(bytes))).toBeNull();
  });

  it("returns null when a picture has a capture date but no GPS tags", () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "little",
      exifDateTimeOriginal: "2025:07:01 10:30:15",
      gpsIfd: null,
    });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it.each([
    ["the north-east", "N", "E", MAX_LATITUDE, MAX_LONGITUDE],
    ["the south-west", "S", "W", MIN_LATITUDE, MIN_LONGITUDE],
  ])(
    "accepts a coordinate exactly on %s range boundary",
    (_, latRef, lonRef, latitude, longitude) => {
      const jpeg = buildGpsJpeg({
        byteOrder: "little",
        gpsIfd: [
          gpsRef(TAG_GPS_LATITUDE_REF, latRef),
          gpsCoordinate(
            TAG_GPS_LATITUDE,
            rational(Math.abs(latitude), 1),
            rational(0, 1),
            rational(0, 1),
          ),
          gpsRef(TAG_GPS_LONGITUDE_REF, lonRef),
          gpsCoordinate(
            TAG_GPS_LONGITUDE,
            rational(Math.abs(longitude), 1),
            rational(0, 1),
            rational(0, 1),
          ),
        ],
      });

      expect(readExifGps(buffer(jpeg))).toEqual({ latitude, longitude });
    },
  );
});

/** A file whose bytes fail to read with `error`, as a picked file whose permission lapsed. */
function unreadableFile(name: string, error: Error): File {
  const file = new File(["bytes"], name, { type: "image/jpeg" });
  file.slice = () => {
    const blob = new Blob();
    blob.arrayBuffer = () => Promise.reject(error);
    return blob;
  };
  return file;
}

describe("captureGps", () => {
  it("takes the EXIF GPS coordinate of a JPEG", async () => {
    const jpeg = buildGpsJpeg({
      byteOrder: "big",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "N"),
        NORTH_LATITUDE,
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        EAST_LONGITUDE,
      ],
    });
    const file = new File([buffer(jpeg)], "a.jpg", { type: "image/jpeg" });

    expect(await captureGps(file)).toEqual({
      latitude: decimalDegrees(
        NORTH_LATITUDE.degrees,
        NORTH_LATITUDE.minutes,
        NORTH_LATITUDE.seconds,
      ),
      longitude: decimalDegrees(
        EAST_LONGITUDE.degrees,
        EAST_LONGITUDE.minutes,
        EAST_LONGITUDE.seconds,
      ),
    });
  });

  it("resolves to null when the file has no GPS tags, rather than rejecting", async () => {
    const file = new File(["not a jpeg"], "a.png", { type: "image/png" });

    expect(await captureGps(file)).toBeNull();
  });

  it("passes a read error through unchanged", async () => {
    const failure = new DOMException("the read was aborted", "AbortError");

    await expect(captureGps(unreadableFile("a.jpg", failure))).rejects.toBe(failure);
  });
});
