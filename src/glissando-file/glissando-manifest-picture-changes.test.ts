import { describe, expect, it } from "vitest";
import { PICTURE_CHANGES_FROM_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredMusic, StoredSlideshow } from "../library/stored-slideshow";

const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Walzer.m4a",
  durationMs: 240_000,
  mimeType: "audio/mp4",
};

function slideshow(music: StoredMusic): StoredSlideshow {
  return {
    id: "show-1",
    title: "Herbst in Wien",
    createdAt: "2025-10-01T08:00:00.000Z",
    pictures: [
      { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 40, height: 30, fileName: "a.jpg" },
    ],
    music,
    secondsPerPicture: 5,
  };
}

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const evenManifest = () => manifestFor(slideshow({ ...MUSIC, pictureChanges: "even" }), [JPEG]);

/** The written manifest of even picture changes, with `formatVersion` and the value set. */
function withPictureChanges(formatVersion: number, pictureChanges: unknown = "even"): string {
  const written = evenManifest();
  return JSON.stringify({
    ...written,
    formatVersion,
    slideshow: {
      ...written.slideshow,
      music: { ...written.slideshow.music, pictureChanges },
    },
  });
}

describe("the music's picture changes in the .glissando file", () => {
  it("are written from format version 8, the version that carries them", () => {
    expect(PICTURE_CHANGES_FROM_VERSION).toBe(8);
    expect(evenManifest().formatVersion).toBeGreaterThanOrEqual(8);
    expect(evenManifest().slideshow.music).toMatchObject({ pictureChanges: "even" });
  });

  it("are absent while the pictures change on the beat", () => {
    expect(manifestFor(slideshow(MUSIC), [JPEG]).slideshow.music).not.toHaveProperty(
      "pictureChanges",
    );
  });

  it("read back as written", () => {
    expect(readManifest(JSON.stringify(evenManifest()))).toEqual({
      kind: "ok",
      manifest: evenManifest(),
    });
  });

  it("make a version 7 file that carries them damaged", () => {
    expect(readManifest(withPictureChanges(7))).toEqual({
      kind: "damaged",
      reason: expect.stringContaining("pictureChanges") as unknown,
    });
  });

  it("name a value that is no choice, its path and what is expected", () => {
    expect(readManifest(withPictureChanges(8, "sometimes"))).toEqual({
      kind: "damaged",
      reason: 'glissando.json slideshow.music.pictureChanges: expected "even", got "sometimes"',
    });
  });
});
