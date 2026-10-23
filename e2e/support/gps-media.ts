import type { Page } from "@playwright/test";
import type { ExifGps } from "../../src/import/exif-gps";
import {
  gpsCoordinate,
  gpsRef,
  rational,
  syntheticGpsJpeg,
  TAG_GPS_LATITUDE,
  TAG_GPS_LATITUDE_REF,
  TAG_GPS_LONGITUDE,
  TAG_GPS_LONGITUDE_REF,
} from "../../src/import/testing/synthetic-gps-jpeg";
import { LANDSCAPE_PICTURE, plainCanvasJpegBase64, type TestFile, withExifApp1 } from "./media";

/**
 * Node's Buffer, which Playwright's file payloads are (as `media.ts` declares it — see there for
 * why only the part used here is declared).
 */
declare const Buffer: {
  from(bytes: Uint8Array): Uint8Array;
  from(text: string, encoding: "base64" | "utf8"): Uint8Array;
};

/** The capture time a GPS test picture has unless a case names one. */
const NOON = "12:00:00";
/** Degrees are written as a single rational to this many decimal places, no minutes or seconds. */
const GPS_COORDINATE_PRECISION = 1_000_000;

/**
 * Like `pictureTakenOn` (`media.ts`), but its EXIF also carries `place`'s GPS coordinate, for a
 * trip chapter's place to resolve from (`TRIP_CHAPTERS.md`, Rule B) — made-up coordinates only,
 * never a real one.
 */
export async function pictureTakenOnAt(
  page: Page,
  name: string,
  day: string,
  colour: string,
  place: ExifGps,
): Promise<TestFile> {
  const encoded = await plainCanvasJpegBase64(page, colour, LANDSCAPE_PICTURE);
  return {
    name,
    mimeType: "image/jpeg",
    buffer: withCaptureDayAndGps(Buffer.from(encoded, "base64"), day, place),
  };
}

/** `jpeg` with an EXIF segment carrying both `day`'s capture date and `gps`'s coordinate. */
function withCaptureDayAndGps(
  jpeg: Uint8Array,
  day: string,
  gps: ExifGps,
  time = NOON,
): Uint8Array {
  const exifSource = syntheticGpsJpeg({
    byteOrder: "little",
    exifDateTimeOriginal: `${day.replaceAll("-", ":")} ${time}`,
    gpsIfd: gpsIfdEntries(gps),
  });
  return withExifApp1(jpeg, exifSource);
}

/** The GPS IFD entries for `gps`, each coordinate as one whole rational (no minutes/seconds). */
function gpsIfdEntries(gps: ExifGps) {
  const zero = rational(0, 1);
  const magnitude = (value: number) =>
    rational(Math.round(Math.abs(value) * GPS_COORDINATE_PRECISION), GPS_COORDINATE_PRECISION);
  return [
    gpsRef(TAG_GPS_LATITUDE_REF, gps.latitude >= 0 ? "N" : "S"),
    gpsCoordinate(TAG_GPS_LATITUDE, magnitude(gps.latitude), zero, zero),
    gpsRef(TAG_GPS_LONGITUDE_REF, gps.longitude >= 0 ? "E" : "W"),
    gpsCoordinate(TAG_GPS_LONGITUDE, magnitude(gps.longitude), zero, zero),
  ];
}
