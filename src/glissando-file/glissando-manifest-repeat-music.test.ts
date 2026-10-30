import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_VERSION,
  manifestFor,
  REPEAT_MUSIC_FROM_VERSION,
} from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const once: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 40,
      height: 30,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};
const repeated: StoredSlideshow = { ...once, repeatMusic: true };

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const asText = (value: unknown): string => JSON.stringify(value);

/** The manifest written for `slideshow`, its slideshow changed and `formatVersion` set. */
function written(
  slideshow: StoredSlideshow,
  change: Record<string, unknown> = {},
  formatVersion = REPEAT_MUSIC_FROM_VERSION,
): string {
  const manifest = manifestFor(slideshow, [JPEG]);
  return asText({ ...manifest, formatVersion, slideshow: { ...manifest.slideshow, ...change } });
}

describe("the slideshow's music repeat in the .glissando file (ADR-0047)", () => {
  it("is written as the format version that carries it", () => {
    expect(REPEAT_MUSIC_FROM_VERSION).toBe(GLISSANDO_FORMAT_VERSION);
    expect(manifestFor(repeated, [JPEG]).slideshow.repeatMusic).toBe(true);
  });

  it("is left out while the playlist plays once, which its absence means", () => {
    expect(manifestFor(once, [JPEG]).slideshow).not.toHaveProperty("repeatMusic");
  });

  it("reads back as written", () => {
    const manifest = manifestFor(repeated, [JPEG]);

    expect(readManifest(asText(manifest))).toEqual({ kind: "ok", manifest });
  });

  it("refuses a file older than the version that carries it", () => {
    expect(readManifest(written(repeated, {}, REPEAT_MUSIC_FROM_VERSION - 1)).kind).toBe("damaged");
  });

  it("names a bad repeatMusic value's path, its value and what is expected", () => {
    expect(readManifest(written(once, { repeatMusic: false }))).toEqual({
      kind: "damaged",
      reason: "glissando.json slideshow.repeatMusic: expected true or absent, got false",
    });
  });
});
