import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_VERSION,
  PICTURE_CHANGES_FROM_VERSION,
  manifestFor,
} from "./glissando-manifest";
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
    songs: [music],
    secondsPerPicture: 5,
  };
}

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const evenManifest = () => manifestFor(slideshow({ ...MUSIC, pictureChanges: "even" }), [JPEG]);

/** The written manifest of even picture changes, with `formatVersion` and the value set. */
function withPictureChanges(
  pictureChanges: unknown,
  formatVersion = GLISSANDO_FORMAT_VERSION,
): string {
  const written = evenManifest();
  const [song] = written.slideshow.songs;
  return JSON.stringify({
    ...written,
    formatVersion,
    slideshow: { ...written.slideshow, songs: [{ ...song, pictureChanges }] },
  });
}

describe("the music's picture changes in the .glissando file", () => {
  it("are written from format version 8, the version that carries them", () => {
    expect(PICTURE_CHANGES_FROM_VERSION).toBe(8);
    expect(evenManifest().formatVersion).toBeGreaterThanOrEqual(8);
    expect(evenManifest().slideshow.songs).toMatchObject([{ pictureChanges: "even" }]);
  });

  it("are absent while the pictures change on the beat", () => {
    expect(manifestFor(slideshow(MUSIC), [JPEG]).slideshow.songs[0]).not.toHaveProperty(
      "pictureChanges",
    );
  });

  it("read back as written", () => {
    expect(readManifest(JSON.stringify(evenManifest()))).toEqual({
      kind: "ok",
      manifest: evenManifest(),
    });
  });

  it("refuses a version 7 file, older than this app still reads (ADR-0023)", () => {
    expect(readManifest(withPictureChanges("even", 7)).kind).toBe("damaged");
  });

  it("name a value that is no choice, its path and what is expected", () => {
    expect(readManifest(withPictureChanges("sometimes"))).toEqual({
      kind: "damaged",
      reason: 'glissando.json slideshow.songs[0].pictureChanges: expected "even", got "sometimes"',
    });
  });
});
