import { describe, expect, it } from "vitest";
import { GLISSANDO_FORMAT_VERSION, LOOK_FROM_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const none: StoredSlideshow = {
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
const warm: StoredSlideshow = { ...none, look: "warm" };

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const asText = (value: unknown): string => JSON.stringify(value);

/** The manifest written for `slideshow`, its slideshow changed and `formatVersion` set. */
function written(
  slideshow: StoredSlideshow,
  change: Record<string, unknown> = {},
  formatVersion = GLISSANDO_FORMAT_VERSION,
): string {
  const manifest = manifestFor(slideshow, [JPEG]);
  return asText({ ...manifest, formatVersion, slideshow: { ...manifest.slideshow, ...change } });
}

describe("the slideshow's colour grade in the .glissando file", () => {
  it("is written as format version 17, the version that carries it", () => {
    expect(LOOK_FROM_VERSION).toBe(17);
    expect(manifestFor(warm, [JPEG]).slideshow.look).toBe("warm");
  });

  it("is left out for None, which its absence means", () => {
    expect(manifestFor(none, [JPEG]).slideshow.title).toBe("Herbst in Wien");
    expect(manifestFor(none, [JPEG]).slideshow).not.toHaveProperty("look");
  });

  it("reads back as written", () => {
    const manifest = manifestFor(warm, [JPEG]);

    expect(readManifest(asText(manifest))).toEqual({ kind: "ok", manifest });
  });

  it("refuses a version 16 file, older than this app still reads (ADR-0044)", () => {
    expect(readManifest(written(warm, {}, 16)).kind).toBe("damaged");
  });

  it("names a bad look's path, its value and what is expected", () => {
    expect(readManifest(written(none, { look: "sepia" }))).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.look: expected one of warm, cool, vivid, film, black-and-white, faded, got "sepia"',
    });
  });
});
