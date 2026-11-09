import { describe, expect, it } from "vitest";
import type { DecodedPicture } from "./downscale";
import type { ExifGps } from "./exif-gps";
import { localPictureSource } from "./local-picture-source";
import type { PictureExif } from "./picture-exif";
import { UnreadablePictureError } from "./unreadable-picture";

const DECODED: DecodedPicture = {
  width: 300,
  height: 200,
  display: new Blob(["display"]),
  thumbnail: new Blob(["thumbnail"]),
};

const CAPTURED_AT = "2025-07-01T10:00:00Z";
const COORDINATE: ExifGps = { latitude: 48.2082, longitude: 16.3738 };
const exifOf = (gps: ExifGps | null) => (): Promise<PictureExif> =>
  Promise.resolve({ capturedAt: CAPTURED_AT, gps });
const noGps = exifOf(null);

describe("localPictureSource", () => {
  it("is identified by its name, capture date and size in bytes, without decoding it", async () => {
    const decoded: string[] = [];
    const source = localPictureSource(new File(["12345678"], "a.jpg", { type: "image/jpeg" }), {
      decode: (file) => (decoded.push(file.name), Promise.resolve(DECODED)),
      exif: noGps,
    });

    expect(await source.identify()).toEqual({
      fileName: "a.jpg",
      capturedAt: "2025-07-01T10:00:00Z",
      fileBytes: 8,
    });
    expect(decoded).toEqual([]);
  });

  it("reads the decoded picture and brings no focus or GPS when there is none", async () => {
    const source = localPictureSource(new File(["x"], "a.jpg", { type: "image/jpeg" }), {
      decode: () => Promise.resolve(DECODED),
      exif: noGps,
    });

    expect(await source.read()).toEqual({ decoded: DECODED, focus: null });
  });

  it("reads the picture's GPS coordinate alongside it", async () => {
    const source = localPictureSource(new File(["x"], "a.jpg", { type: "image/jpeg" }), {
      decode: () => Promise.resolve(DECODED),
      exif: exifOf(COORDINATE),
    });

    expect(await source.read()).toEqual({ decoded: DECODED, focus: null, gps: COORDINATE });
  });

  it("reads the file's EXIF once for both its capture date and its GPS coordinate", async () => {
    const reads: string[] = [];
    const source = localPictureSource(new File(["x"], "a.jpg", { type: "image/jpeg" }), {
      decode: () => Promise.resolve(DECODED),
      exif: (file) => (reads.push(file.name), exifOf(COORDINATE)()),
    });

    expect((await source.identify()).capturedAt).toBe(CAPTURED_AT);
    expect(await source.read()).toEqual({ decoded: DECODED, focus: null, gps: COORDINATE });
    expect(reads).toEqual(["a.jpg"]);
  });

  it("keeps an identified picture and its GPS coordinate when the file turns unreadable", async () => {
    const lapsed = new UnreadablePictureError("a.jpg", "read");
    let readable = true;
    const source = localPictureSource(new File(["x"], "a.jpg", { type: "image/jpeg" }), {
      decode: () => Promise.resolve(DECODED),
      exif: () => (readable ? exifOf(COORDINATE)() : Promise.reject(lapsed)),
    });

    await source.identify();
    readable = false;

    expect(await source.read()).toEqual({ decoded: DECODED, focus: null, gps: COORDINATE });
  });

  describe("a failing read or decode", () => {
    const file = () => new File(["x"], "a.jpg", { type: "image/jpeg" });

    /** Fails with `failure` on the first `failures` calls, then succeeds with `value`. */
    function flaky<T>(failures: number, failure: unknown, value: T) {
      const calls = { count: 0 };
      return {
        calls,
        run: (): Promise<T> =>
          ++calls.count <= failures ? Promise.reject(failure) : Promise.resolve(value),
      };
    }

    it("is retried once when the EXIF cannot be read", async () => {
      const lapsed = new UnreadablePictureError("a.jpg", "read");
      const { calls, run } = flaky(1, lapsed, { capturedAt: CAPTURED_AT, gps: COORDINATE });
      const source = localPictureSource(file(), {
        decode: () => Promise.resolve(DECODED),
        exif: run,
      });

      expect((await source.identify()).capturedAt).toBe(CAPTURED_AT);
      expect(await source.read()).toEqual({ decoded: DECODED, focus: null, gps: COORDINATE });
      expect(calls.count).toBe(2);
    });

    it("is retried once when the picture cannot be decoded", async () => {
      const failure = new UnreadablePictureError("a.jpg", "decode");
      const { calls, run } = flaky(1, failure, DECODED);
      const source = localPictureSource(file(), { decode: run, exif: noGps });

      expect(await source.read()).toEqual({ decoded: DECODED, focus: null });
      expect(calls.count).toBe(2);
    });

    it("is not retried when the picture is too large", async () => {
      const failure = new UnreadablePictureError("a.jpg", "tooLarge");
      const { calls, run } = flaky(1, failure, DECODED);
      const source = localPictureSource(file(), { decode: run, exif: noGps });

      await expect(source.read()).rejects.toBe(failure);
      expect(calls.count).toBe(1);
    });

    it.each(["read", "decode"] as const)(
      "gives up after the second %s failure, with that failure",
      async (stage) => {
        const failure = new UnreadablePictureError("a.jpg", stage);
        const { calls, run } = flaky(2, failure, DECODED);
        const source = localPictureSource(file(), {
          decode: stage === "decode" ? run : () => Promise.resolve(DECODED),
          exif: stage === "read" ? () => run().then(noGps) : noGps,
        });

        const rejected = stage === "read" ? source.identify() : source.read();
        await expect(rejected).rejects.toBe(failure);
        expect(calls.count).toBe(2);
      },
    );

    it("is not retried when it fails for another reason", async () => {
      const other = new Error("out of luck");
      const { calls, run } = flaky(1, other, DECODED);
      const source = localPictureSource(file(), { decode: run, exif: noGps });

      await expect(source.read()).rejects.toBe(other);
      expect(calls.count).toBe(1);
    });
  });
});
