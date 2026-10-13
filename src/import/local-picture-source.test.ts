import { describe, expect, it } from "vitest";
import type { DecodedPicture } from "./downscale";
import { localPictureSource } from "./local-picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

const DECODED: DecodedPicture = {
  width: 300,
  height: 200,
  display: new Blob(["display"]),
  thumbnail: new Blob(["thumbnail"]),
};

describe("localPictureSource", () => {
  it("is identified by its name, capture date and size in bytes, without decoding it", async () => {
    const decoded: string[] = [];
    const source = localPictureSource(new File(["12345678"], "a.jpg", { type: "image/jpeg" }), {
      decode: (file) => (decoded.push(file.name), Promise.resolve(DECODED)),
      captureDate: () => Promise.resolve("2025-07-01T10:00:00Z"),
    });

    expect(await source.identify()).toEqual({
      fileName: "a.jpg",
      capturedAt: "2025-07-01T10:00:00Z",
      fileBytes: 8,
    });
    expect(decoded).toEqual([]);
  });

  it("reads the decoded picture and brings no focus", async () => {
    const source = localPictureSource(new File(["x"], "a.jpg", { type: "image/jpeg" }), {
      decode: () => Promise.resolve(DECODED),
      captureDate: () => Promise.resolve("2025-07-01T10:00:00Z"),
    });

    expect(await source.read()).toEqual({ decoded: DECODED, focus: null });
  });

  describe("a failing read or decode", () => {
    const file = () => new File(["x"], "a.jpg", { type: "image/jpeg" });
    const captureDate = () => Promise.resolve("2025-07-01T10:00:00Z");

    /** Fails with `failure` on the first `failures` calls, then succeeds with `value`. */
    function flaky<T>(failures: number, failure: unknown, value: T) {
      const calls = { count: 0 };
      return {
        calls,
        run: (): Promise<T> =>
          ++calls.count <= failures ? Promise.reject(failure) : Promise.resolve(value),
      };
    }

    it("is retried once when the capture date cannot be read", async () => {
      const lapsed = new UnreadablePictureError("a.jpg", "read");
      const { calls, run } = flaky(1, lapsed, "2025-07-01T10:00:00Z");
      const source = localPictureSource(file(), {
        decode: () => Promise.resolve(DECODED),
        captureDate: run,
      });

      expect((await source.identify()).capturedAt).toBe("2025-07-01T10:00:00Z");
      expect(calls.count).toBe(2);
    });

    it("is retried once when the picture cannot be decoded", async () => {
      const failure = new UnreadablePictureError("a.jpg", "decode");
      const { calls, run } = flaky(1, failure, DECODED);
      const source = localPictureSource(file(), { decode: run, captureDate });

      expect(await source.read()).toEqual({ decoded: DECODED, focus: null });
      expect(calls.count).toBe(2);
    });

    it.each(["read", "decode"] as const)(
      "gives up after the second %s failure, with that failure",
      async (stage) => {
        const failure = new UnreadablePictureError("a.jpg", stage);
        const { calls, run } = flaky(2, failure, DECODED);
        const source = localPictureSource(file(), {
          decode: stage === "decode" ? run : () => Promise.resolve(DECODED),
          captureDate: stage === "read" ? () => run().then(() => "") : captureDate,
        });

        const rejected = stage === "read" ? source.identify() : source.read();
        await expect(rejected).rejects.toBe(failure);
        expect(calls.count).toBe(2);
      },
    );

    it("is not retried when it fails for another reason", async () => {
      const other = new Error("out of luck");
      const { calls, run } = flaky(1, other, DECODED);
      const source = localPictureSource(file(), { decode: run, captureDate });

      await expect(source.read()).rejects.toBe(other);
      expect(calls.count).toBe(1);
    });
  });
});
