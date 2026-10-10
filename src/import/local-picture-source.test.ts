import { describe, expect, it } from "vitest";
import type { DecodedPicture } from "./downscale";
import { localPictureSource } from "./local-picture-source";

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
});
