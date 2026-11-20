import { describe, expect, it } from "vitest";
import type { StoredFocus } from "../library/picture-focus";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { manifestFor, SHARPNESS_FROM_VERSION } from "./glissando-manifest";
import { readManifest } from "./read-manifest";

const slideshow: StoredSlideshow = {
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
const MEASURED: StoredFocus = {
  focus: {
    kind: "subject",
    box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
    foundBy: "face",
    sharpness: 240.5,
  },
  detector: 4,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG], new Map(), new Map([["p1", MEASURED]]));

describe("a found focus's sharpness in the .glissando file (ADR-0061)", () => {
  it("is written as the format version that carries it", () => {
    expect(SHARPNESS_FROM_VERSION).toBe(23);
    expect(manifest().formatVersion).toBe(SHARPNESS_FROM_VERSION);
    expect(manifest().slideshow.pictures[0]?.focus).toEqual(MEASURED);
  });

  it("reads back as written", () => {
    expect(readManifest(JSON.stringify(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("refuses a file older than the version that carries it", () => {
    const older = { ...manifest(), formatVersion: SHARPNESS_FROM_VERSION - 1 };

    expect(readManifest(JSON.stringify(older)).kind).toBe("damaged");
  });
});
