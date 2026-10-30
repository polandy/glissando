import { EXIF_SEARCH_BYTES } from "./exif-capture-date";
import { readPictureHead } from "./unreadable-picture";
import {
  findEntry,
  findExifTiffStart,
  readAscii,
  readTiffByteOrder,
  readU16,
  readU32,
  TYPE_ASCII,
} from "./exif-ifd";

/** A decoded GPS coordinate: positive latitude is north, positive longitude is east. */
export interface ExifGps {
  readonly latitude: number;
  readonly longitude: number;
}

export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

const TAG_GPS_IFD_POINTER = 0x8825;
const TAG_GPS_LATITUDE_REF = 0x0001;
const TAG_GPS_LATITUDE = 0x0002;
const TAG_GPS_LONGITUDE_REF = 0x0003;
const TAG_GPS_LONGITUDE = 0x0004;
const REF_NORTH = "N";
const REF_SOUTH = "S";
const REF_EAST = "E";
const REF_WEST = "W";

/** EXIF value type for a rational: an unsigned numerator and denominator, 4 bytes each. */
const TYPE_RATIONAL = 5;
/** Degrees, minutes, seconds — one rational each. */
const DMS_RATIONAL_COUNT = 3;
const RATIONAL_BYTES = 8;
const MINUTES_PER_DEGREE = 60;
const SECONDS_PER_DEGREE = 3600;
/** The sentinel some cameras write in place of a real reading when they have no GPS fix. */
const NO_GPS_DATA_SENTINEL = 0;

/** The GPS coordinate of a JPEG's EXIF/TIFF block, or null; never throws. */
export function readExifGps(bytes: ArrayBuffer): ExifGps | null {
  const data = new DataView(bytes);
  const tiffStart = findExifTiffStart(data);
  return tiffStart === null ? null : readGpsCoordinates(data, tiffStart);
}

/** EXIF GPS coordinate of the file's head, or null when the picture carries none. */
export async function captureGps(file: File): Promise<ExifGps | null> {
  const head = await readPictureHead(file, EXIF_SEARCH_BYTES);
  return readExifGps(head);
}

function readGpsCoordinates(data: DataView, tiffStart: number): ExifGps | null {
  const little = readTiffByteOrder(data, tiffStart);
  if (little === null) {
    return null;
  }
  const ifd0 = readU32(data, tiffStart + 4, little);
  const gpsIfdEntry =
    ifd0 === null ? null : findEntry(data, tiffStart, ifd0, TAG_GPS_IFD_POINTER, little);
  const gpsIfd = gpsIfdEntry === null ? null : readU32(data, gpsIfdEntry + 8, little);
  if (gpsIfd === null) {
    return null;
  }

  const latitudeSign = readRefSign(data, tiffStart, gpsIfd, TAG_GPS_LATITUDE_REF, little, [
    REF_NORTH,
    REF_SOUTH,
  ]);
  const longitudeSign = readRefSign(data, tiffStart, gpsIfd, TAG_GPS_LONGITUDE_REF, little, [
    REF_EAST,
    REF_WEST,
  ]);
  const latitudeMagnitude = readDmsCoordinate(data, tiffStart, gpsIfd, TAG_GPS_LATITUDE, little);
  const longitudeMagnitude = readDmsCoordinate(data, tiffStart, gpsIfd, TAG_GPS_LONGITUDE, little);
  if (
    latitudeSign === null ||
    longitudeSign === null ||
    latitudeMagnitude === null ||
    longitudeMagnitude === null
  ) {
    return null;
  }

  const latitude = latitudeSign * latitudeMagnitude;
  const longitude = longitudeSign * longitudeMagnitude;
  if (latitude === NO_GPS_DATA_SENTINEL && longitude === NO_GPS_DATA_SENTINEL) {
    return null;
  }
  if (
    latitude < MIN_LATITUDE ||
    latitude > MAX_LATITUDE ||
    longitude < MIN_LONGITUDE ||
    longitude > MAX_LONGITUDE
  ) {
    return null;
  }
  return { latitude, longitude };
}

/** +1/-1 for a ref tag matching `[positive, negative]`, else null (missing or unrecognised). */
function readRefSign(
  data: DataView,
  tiffStart: number,
  gpsIfd: number,
  tag: number,
  little: boolean,
  [positiveRef, negativeRef]: readonly [string, string],
): number | null {
  const entry = findEntry(data, tiffStart, gpsIfd, tag, little);
  if (entry === null || readU16(data, entry + 2, little) !== TYPE_ASCII) {
    return null;
  }
  // The ref is one ASCII character plus a null terminator: always inline, never at an offset.
  const ref = readAscii(data, entry + 8, 1);
  if (ref === positiveRef) {
    return 1;
  }
  if (ref === negativeRef) {
    return -1;
  }
  return null;
}

/** The unsigned decimal degrees of a GPSLatitude/GPSLongitude tag's degrees/minutes/seconds. */
function readDmsCoordinate(
  data: DataView,
  tiffStart: number,
  gpsIfd: number,
  tag: number,
  little: boolean,
): number | null {
  const entry = findEntry(data, tiffStart, gpsIfd, tag, little);
  if (entry === null || readU16(data, entry + 2, little) !== TYPE_RATIONAL) {
    return null;
  }
  if (readU32(data, entry + 4, little) !== DMS_RATIONAL_COUNT) {
    return null;
  }
  // RATIONAL(3) is 24 bytes, always bigger than an inline value: entry+8 holds an offset.
  const valuesOffset = readU32(data, entry + 8, little);
  const values =
    valuesOffset === null
      ? null
      : readRationals(data, tiffStart + valuesOffset, DMS_RATIONAL_COUNT, little);
  if (values === null) {
    return null;
  }
  // readRationals returns exactly `count` values or null, so this triplet is complete.
  const [degrees, minutes, seconds] = values as [number, number, number];
  return degrees + minutes / MINUTES_PER_DEGREE + seconds / SECONDS_PER_DEGREE;
}

/** `count` consecutive RATIONAL values starting at `at`, or null if any is unreadable. */
function readRationals(
  data: DataView,
  at: number,
  count: number,
  little: boolean,
): number[] | null {
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const numerator = readU32(data, at + index * RATIONAL_BYTES, little);
    const denominator = readU32(data, at + index * RATIONAL_BYTES + 4, little);
    if (numerator === null || denominator === null || denominator === 0) {
      return null;
    }
    values.push(numerator / denominator);
  }
  return values;
}
