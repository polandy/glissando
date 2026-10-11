import { describe, expect, it } from "vitest";
import { PICTURE_LENGTH_FROM_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import type { StoredSlideshow } from "../library/stored-slideshow";

const FILLING: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 40, height: 30, fileName: "a.jpg" },
  ],
  music: { id: "m1", fileName: "Walzer.m4a", durationMs: 240_000, mimeType: "audio/mp4" },
  secondsPerPicture: 5,
};
const OWN_SECONDS: StoredSlideshow = { ...FILLING, pictureLength: OWN_SECONDS_PICTURE_LENGTH };

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const ownSecondsManifest = () => manifestFor(OWN_SECONDS, [JPEG]);

/** The written manifest of own seconds, with `formatVersion` and the value set. */
function withPictureLength(formatVersion: number, pictureLength: unknown = "seconds"): string {
  const written = ownSecondsManifest();
  return JSON.stringify({
    ...written,
    formatVersion,
    slideshow: { ...written.slideshow, pictureLength },
  });
}

describe("the slideshow's picture length in the .glissando file", () => {
  it("is written from format version 9, the version that carries it", () => {
    expect(PICTURE_LENGTH_FROM_VERSION).toBe(9);
    expect(ownSecondsManifest().formatVersion).toBe(9);
    expect(ownSecondsManifest().slideshow).toMatchObject({ pictureLength: "seconds" });
  });

  it("is absent while the pictures fill the music", () => {
    expect(manifestFor(FILLING, [JPEG]).slideshow).not.toHaveProperty("pictureLength");
  });

  it("reads back as written", () => {
    expect(readManifest(JSON.stringify(ownSecondsManifest()))).toEqual({
      kind: "ok",
      manifest: ownSecondsManifest(),
    });
  });

  it("makes a version 8 file that carries it damaged", () => {
    expect(readManifest(withPictureLength(8))).toEqual({
      kind: "damaged",
      reason: expect.stringContaining("pictureLength") as unknown,
    });
  });

  it("names a value that is no choice, its path and what is expected", () => {
    expect(readManifest(withPictureLength(9, "fill"))).toEqual({
      kind: "damaged",
      reason: 'glissando.json slideshow.pictureLength: expected "seconds", got "fill"',
    });
  });
});
