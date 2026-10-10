import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSITION_FROM_VERSION,
  GLISSANDO_FORMAT_VERSION,
  manifestFor,
} from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const crossfading: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 40, height: 30, fileName: "a.jpg" },
  ],
  secondsPerPicture: 5,
};
const alternating: StoredSlideshow = { ...crossfading, transition: "alternate" };

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

describe("the slideshow's default transition in the .glissando file", () => {
  it("is written as format version 6, the version that carries it", () => {
    expect(DEFAULT_TRANSITION_FROM_VERSION).toBe(6);
    expect(manifestFor(alternating, [JPEG]).slideshow.transition).toBe("alternate");
  });

  it("is left out for the crossfade, which its absence means", () => {
    expect(manifestFor(crossfading, [JPEG]).slideshow.title).toBe("Herbst in Wien");
    expect(manifestFor(crossfading, [JPEG]).slideshow).not.toHaveProperty("transition");
  });

  it("reads back as written", () => {
    const manifest = manifestFor(alternating, [JPEG]);

    expect(readManifest(asText(manifest))).toEqual({ kind: "ok", manifest });
  });

  it("reads a version 5 file, which knows no default transition, as the crossfade", () => {
    const reading = readManifest(written(crossfading, {}, 5));

    expect(reading.kind === "ok" && reading.manifest.slideshow.title).toBe("Herbst in Wien");
    expect(reading.kind === "ok" && reading.manifest.slideshow).not.toHaveProperty("transition");
  });

  it("takes a default transition in a version 5 file for a damaged file", () => {
    expect(readManifest(written(alternating, {}, 5)).kind).toBe("damaged");
  });

  it("names a bad default transition's path, its value and what is expected", () => {
    expect(readManifest(written(crossfading, { transition: "fade" }))).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.transition: expected one of crossfade, push-left, wipe-right, circle-open, zoom-in, dissolve, cut, alternate, got "fade"',
    });
  });
});
