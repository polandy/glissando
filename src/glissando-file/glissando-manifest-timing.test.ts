import { describe, expect, it } from "vitest";
import { OWN_TIMING_FROM_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      durationMs: 8000,
      transition: "cut",
    },
    {
      id: "p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      transition: "dissolve",
    },
  ],
  secondsPerPicture: 5,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG, JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

/** The written manifest with the first picture changed and `formatVersion` set. */
function withFirstPicture(change: Record<string, unknown>, formatVersion = 4): string {
  const written = manifest();
  const [first, ...rest] = written.slideshow.pictures;
  return asText({
    ...written,
    formatVersion,
    slideshow: { ...written.slideshow, pictures: [{ ...first, ...change }, ...rest] },
  });
}

describe("a picture's own duration and transition in the .glissando file", () => {
  it("is written from format version 4, the version that carries them", () => {
    expect(OWN_TIMING_FROM_VERSION).toBe(4);
    expect(manifest().slideshow.pictures[0]).toMatchObject({ durationMs: 8000, transition: "cut" });
    expect(manifest().slideshow.pictures[1]).toMatchObject({ transition: "dissolve" });
    expect(manifest().slideshow.pictures[1]).not.toHaveProperty("durationMs");
  });

  it("reads back as written", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("reads a version 3 file, which knows no own timing", () => {
    const written = manifest();
    const pictures = written.slideshow.pictures.map((picture) => ({
      ...picture,
      durationMs: undefined,
      transition: undefined,
    }));
    const versionThree = {
      ...written,
      formatVersion: 3,
      slideshow: { ...written.slideshow, pictures },
    };

    const reading = readManifest(asText(versionThree));

    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[0]?.fileName).toBe("a.jpg");
    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[0]).not.toHaveProperty(
      "durationMs",
    );
    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[0]).not.toHaveProperty(
      "transition",
    );
  });

  it.each([
    ["an own duration in a version 3 file", withFirstPicture({ transition: undefined }, 3)],
    ["an own transition in a version 3 file", withFirstPicture({ durationMs: undefined }, 3)],
  ])("takes %s for a damaged file", (_, text) => {
    expect(readManifest(text).kind).toBe("damaged");
  });

  it("names a bad own duration's path, its value and what is expected", () => {
    expect(readManifest(withFirstPicture({ durationMs: 8200 }))).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.pictures[0].durationMs: expected whole milliseconds from 2000 to 15000 in steps of 500, got 8200",
    });
  });

  it("names a bad own transition's path, its value and what is expected", () => {
    expect(readManifest(withFirstPicture({ transition: "fade" }))).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.pictures[0].transition: expected one of crossfade, push-left, wipe-right, circle-open, zoom-in, dissolve, cut, got "fade"',
    });
  });
});
