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
import {
  decimalDegrees,
  gpsCoordinate,
  gpsRef,
  rational,
  syntheticGpsJpeg,
  TAG_GPS_LATITUDE,
  TAG_GPS_LATITUDE_REF,
  TAG_GPS_LONGITUDE,
  TAG_GPS_LONGITUDE_REF,
  type ByteOrder,
} from "./testing/synthetic-gps-jpeg";

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
      const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({ byteOrder: "little", gpsIfd: null });

    expect(readExifGps(buffer(jpeg))).toBeNull();
  });

  it("returns null when the GPS IFD is missing one of the four required tags", () => {
    const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
      const jpeg = syntheticGpsJpeg({
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
    const jpeg = syntheticGpsJpeg({
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
