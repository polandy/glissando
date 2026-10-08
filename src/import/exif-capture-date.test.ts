import { describe, expect, it } from "vitest";
import { captureDate, readExifCaptureDate } from "./exif-capture-date";
import { EXIF_IFD_OFFSET, syntheticJpeg, type ByteOrder } from "./testing/synthetic-jpeg";

const buffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer;

/** Overwrites a 32-bit field of the TIFF block in the given byte order. */
function patchU32(bytes: Uint8Array, at: number, value: number, byteOrder: ByteOrder): Uint8Array {
  const patched = bytes.slice();
  new DataView(patched.buffer).setUint32(at, value, byteOrder === "little");
  return patched;
}

describe("readExifCaptureDate", () => {
  it.each<ByteOrder>(["little", "big"])(
    "reads DateTimeOriginal from %s-endian EXIF as the wall time with a Z suffix",
    (byteOrder) => {
      const jpeg = syntheticJpeg({ byteOrder, dateTimeOriginal: "2025:07:01 10:30:15" });

      expect(readExifCaptureDate(buffer(jpeg.bytes))).toBe("2025-07-01T10:30:15Z");
    },
  );

  it("finds the EXIF segment after a JFIF segment", () => {
    const jpeg = syntheticJpeg({
      byteOrder: "big",
      dateTimeOriginal: "2024:12:31 23:59:59",
      withApp0: true,
    });

    expect(readExifCaptureDate(buffer(jpeg.bytes))).toBe("2024-12-31T23:59:59Z");
  });

  it.each([
    ["the tag is missing", null],
    ["the camera wrote no date", "0000:00:00 00:00:00"],
    ["the date is blank", "                   "],
    ["the month does not exist", "2025:13:01 10:00:00"],
    ["the day does not exist in that month", "2025:02:30 10:00:00"],
    ["the time does not exist", "2025:07:01 24:00:00"],
    ["the separators are wrong", "2025-07-01T10:00:00"],
  ])("returns null when %s", (_, dateTimeOriginal) => {
    const jpeg = syntheticJpeg({ byteOrder: "little", dateTimeOriginal });

    expect(readExifCaptureDate(buffer(jpeg.bytes))).toBeNull();
  });

  it.each([
    ["an empty file", new Uint8Array()],
    ["a PNG", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["a JPEG without EXIF", Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])],
    [
      "garbage after a JPEG, EXIF and TIFF header",
      Uint8Array.from([
        ...[0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00],
        ...[0x49, 0x49, 0x2a, 0x00],
        ...Array.from({ length: 62 }, (_, index) => (index * 37 + 11) & 0xff),
      ]),
    ],
  ])("returns null for %s", (_, bytes) => {
    expect(readExifCaptureDate(buffer(bytes))).toBeNull();
  });

  it("returns null for every truncation that cuts into the date", () => {
    const jpeg = syntheticJpeg({ byteOrder: "little", dateTimeOriginal: "2025:07:01 10:30:15" });

    for (let length = 0; length < jpeg.dateEnd; length += 1) {
      expect(readExifCaptureDate(buffer(jpeg.bytes.subarray(0, length))), `${length} bytes`).toBe(
        null,
      );
    }
    expect(readExifCaptureDate(buffer(jpeg.bytes.subarray(0, jpeg.dateEnd)))).toBe(
      "2025-07-01T10:30:15Z",
    );
  });

  it.each<ByteOrder>(["little", "big"])(
    "returns null when a %s-endian offset points outside the data",
    (byteOrder) => {
      const jpeg = syntheticJpeg({ byteOrder, dateTimeOriginal: "2025:07:01 10:30:15" });
      const exifIfdPointerValue = jpeg.tiffStart + 8 + 2 + 8;

      for (const offset of [0xffffffff, 0x7ffffff0, EXIF_IFD_OFFSET + 4096]) {
        const patched = patchU32(jpeg.bytes, exifIfdPointerValue, offset, byteOrder);
        expect(readExifCaptureDate(buffer(patched)), `offset ${offset}`).toBeNull();
      }
    },
  );

  it("returns null when a segment length runs past the end of the data", () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff, 0x00]);

    expect(readExifCaptureDate(buffer(bytes))).toBeNull();
  });
});

describe("captureDate", () => {
  it("takes the EXIF capture date of a JPEG", async () => {
    const jpeg = syntheticJpeg({ byteOrder: "big", dateTimeOriginal: "2025:07:01 10:30:15" });
    const file = new File([buffer(jpeg.bytes)], "a.jpg", {
      type: "image/jpeg",
      lastModified: new Date(2026, 0, 2, 3, 4, 5).getTime(),
    });

    expect(await captureDate(file)).toBe("2025-07-01T10:30:15Z");
  });

  it("falls back to the file's local modification time, written with a Z suffix", async () => {
    const file = new File(["not a jpeg"], "a.png", {
      type: "image/png",
      lastModified: new Date(2026, 0, 2, 3, 4, 5).getTime(),
    });

    expect(await captureDate(file)).toBe("2026-01-02T03:04:05Z");
  });
});
