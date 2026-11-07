import { describe, expect, it } from "vitest";
import { readPictureExif } from "./picture-exif";
import { UnreadablePictureError } from "./unreadable-picture";
import { syntheticJpeg } from "./testing/synthetic-jpeg";
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
} from "./testing/synthetic-gps-jpeg";

const buffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer;
const MODIFIED = new Date(2026, 0, 2, 3, 4, 5).getTime();

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

/** A file that records every slice of it that is read. */
function countingFile(bytes: ArrayBuffer): { file: File; reads: string[] } {
  const file = new File([bytes], "a.jpg", { type: "image/jpeg", lastModified: MODIFIED });
  const reads: string[] = [];
  const slice = file.slice.bind(file);
  file.slice = (...args) => {
    const blob = slice(...args);
    const arrayBuffer = blob.arrayBuffer.bind(blob);
    blob.arrayBuffer = () => (reads.push("head"), arrayBuffer());
    return blob;
  };
  return { file, reads };
}

describe("readPictureExif", () => {
  it("takes the EXIF capture date of a JPEG", async () => {
    const jpeg = syntheticJpeg({ byteOrder: "big", dateTimeOriginal: "2025:07:01 10:30:15" });
    const file = new File([buffer(jpeg.bytes)], "a.jpg", { type: "image/jpeg" });

    expect(await readPictureExif(file)).toEqual({ capturedAt: "2025-07-01T10:30:15Z", gps: null });
  });

  it("takes the EXIF GPS coordinate of a JPEG from the same single read of its head", async () => {
    const latitude = gpsCoordinate(
      TAG_GPS_LATITUDE,
      rational(10, 1),
      rational(30, 1),
      rational(0, 1),
    );
    const longitude = gpsCoordinate(
      TAG_GPS_LONGITUDE,
      rational(20, 1),
      rational(15, 1),
      rational(0, 1),
    );
    const jpeg = syntheticGpsJpeg({
      byteOrder: "big",
      gpsIfd: [
        gpsRef(TAG_GPS_LATITUDE_REF, "N"),
        latitude,
        gpsRef(TAG_GPS_LONGITUDE_REF, "E"),
        longitude,
      ],
    });
    const { file, reads } = countingFile(buffer(jpeg));

    expect(await readPictureExif(file)).toEqual({
      capturedAt: "2026-01-02T03:04:05Z",
      gps: {
        latitude: decimalDegrees(latitude.degrees, latitude.minutes, latitude.seconds),
        longitude: decimalDegrees(longitude.degrees, longitude.minutes, longitude.seconds),
      },
    });
    expect(reads).toEqual(["head"]);
  });

  it("falls back to the file's local modification time, written with a Z suffix, and no GPS", async () => {
    const file = new File(["not a jpeg"], "a.png", { type: "image/png", lastModified: MODIFIED });

    expect(await readPictureExif(file)).toEqual({ capturedAt: "2026-01-02T03:04:05Z", gps: null });
  });

  it("rejects a file the browser can no longer read with UnreadablePictureError", async () => {
    const notReadable = new DOMException("the file could not be read", "NotReadableError");
    const error: unknown = await readPictureExif(unreadableFile("lapsed.jpg", notReadable)).catch(
      (rejection: unknown) => rejection,
    );

    expect(error).toBeInstanceOf(UnreadablePictureError);
    expect((error as UnreadablePictureError).fileName).toBe("lapsed.jpg");
    expect((error as UnreadablePictureError).stage).toBe("read");
    expect((error as UnreadablePictureError).cause).toBe(notReadable);
  });

  it("passes any other read error through unchanged", async () => {
    const failure = new DOMException("the read was aborted", "AbortError");

    await expect(readPictureExif(unreadableFile("a.jpg", failure))).rejects.toBe(failure);
  });
});
