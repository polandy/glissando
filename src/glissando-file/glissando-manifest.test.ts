import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_VERSION,
  OLDEST_READABLE_FORMAT_VERSION,
  manifestFor,
  picturePaths,
  songPath,
  typeOfPicturePath,
  type GlissandoManifest,
} from "./glissando-manifest";
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
      caption: "Am Steg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
    {
      id: "p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      kenBurns: {
        from: { zoom: 2.5, centerX: 0.3, centerY: 0.2 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      },
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  ownOrder: true,
  songs: [{ id: "m1", fileName: "Walzer.m4a", durationMs: 240000, mimeType: "audio/mp4" }],
  secondsPerPicture: 5,
};

const manifest = (): GlissandoManifest => manifestFor(slideshow, [JPEG, JPEG]);

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };

const asText = (value: unknown): string => JSON.stringify(value);

function withSlideshow(change: Record<string, unknown>): string {
  const written = manifest();
  return asText({ ...written, slideshow: { ...written.slideshow, ...change } });
}

describe("manifestFor", () => {
  it("names the format and its version and keeps the slideshow without device ids", () => {
    const written = manifest();
    expect(written.format).toBe("glissando");
    expect(written.formatVersion).toBe(GLISSANDO_FORMAT_VERSION);
    expect(written.slideshow.pictures[0]).toEqual({
      file: "pictures/0001.jpg",
      thumbnail: "thumbnails/0001.jpg",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      caption: "Am Steg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    });
    expect(written.slideshow.songs).toEqual([
      {
        file: "music/track-1.m4a",
        fileName: "Walzer.m4a",
        durationMs: 240000,
        mimeType: "audio/mp4",
      },
    ]);
    expect(written.slideshow.pictures[1]?.kenBurns).toEqual(slideshow.pictures[1]?.kenBurns);
    expect(written.slideshow.pictures[1]).not.toHaveProperty("caption");
    expect(asText(written)).not.toContain("show-1");
    expect(asText(written)).not.toContain('"p1"');
  });
});

describe("media paths", () => {
  it("numbers pictures from 0001 with the extension of their type", () => {
    expect(picturePaths(0, { display: "image/jpeg", thumbnail: "image/webp" })).toEqual({
      file: "pictures/0001.jpg",
      thumbnail: "thumbnails/0001.webp",
    });
  });

  it.each([
    [0, "Walzer.M4A", "music/track-1.m4a"],
    [0, "no extension", "music/track-1"],
    [0, "odd.ex t", "music/track-1"],
    [2, "Walzer.m4a", "music/track-3.m4a"],
  ])("puts song %j at %j, by its index in the playlist", (index, fileName, expected) => {
    expect(songPath(index, fileName)).toBe(expected);
  });

  it("refuses to write a picture type it has no extension for", () => {
    expect(() => picturePaths(0, { display: "image/gif", thumbnail: "image/jpeg" })).toThrow(
      /image\/gif/,
    );
  });

  it("reads a picture's type back from its extension", () => {
    expect(typeOfPicturePath("pictures/0007.png")).toBe("image/png");
    expect(typeOfPicturePath("pictures/0007.gif")).toBeNull();
  });
});

describe("readManifest", () => {
  it("reads back what manifestFor wrote", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it.each([1, 2, 9])(
    "refuses a version %d file, older than this app still reads (ADR-0023)",
    (formatVersion) => {
      const written = manifest();
      const text = asText({ ...written, formatVersion });

      expect(readManifest(text)).toEqual({
        kind: "damaged",
        reason: `glissando.json formatVersion: expected a whole number from ${OLDEST_READABLE_FORMAT_VERSION} to ${GLISSANDO_FORMAT_VERSION}, got ${formatVersion}`,
      });
    },
  );

  it.each([
    ["another format id", asText({ ...manifest(), format: "zip-of-photos" })],
    ["no format id", asText({ formatVersion: 1 })],
    ["a JSON array", "[]"],
  ])("takes %s for a foreign file", (_, text) => {
    expect(readManifest(text).kind).toBe("foreign");
  });

  it("takes a later format version for a newer file, whatever else changed", () => {
    const text = asText({ format: "glissando", formatVersion: GLISSANDO_FORMAT_VERSION + 1 });
    expect(readManifest(text).kind).toBe("newer");
  });

  it.each([
    ["text that is no JSON", "{ cut off"],
    ["a version that is no whole number", asText({ ...manifest(), formatVersion: "1" })],
    ["an unknown key", asText({ ...manifest(), extra: true })],
    ["no pictures", withSlideshow({ pictures: [] })],
    ["an empty title", withSlideshow({ title: "" })],
    ["seconds per picture out of range", withSlideshow({ secondsPerPicture: 99 })],
    [
      "a capture date that is no date",
      withSlideshow({ pictures: [{ ...manifest().slideshow.pictures[0], capturedAt: "soon" }] }),
    ],
    [
      "a zero width",
      withSlideshow({ pictures: [{ ...manifest().slideshow.pictures[0], width: 0 }] }),
    ],
    [
      "a song without duration",
      withSlideshow({
        songs: [{ ...manifest().slideshow.songs[0], durationMs: -1 }],
      }),
    ],
    ["ownOrder other than true", withSlideshow({ ownOrder: false })],
    [
      "an own motion zoomed past the maximum",
      withSlideshow({
        pictures: [
          {
            ...manifest().slideshow.pictures[0],
            kenBurns: {
              from: { zoom: 9, centerX: 0.5, centerY: 0.5 },
              to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
            },
          },
        ],
      }),
    ],
    ["an own motion in a version 1 file", asText({ ...manifest(), formatVersion: 1 })],
    ["a caption in a version 2 file", asText({ ...manifest(), formatVersion: 2 })],
    [
      "an empty caption",
      withSlideshow({ pictures: [{ ...manifest().slideshow.pictures[0], caption: "" }] }),
    ],
    [
      "a caption longer than 80 characters",
      withSlideshow({
        pictures: [{ ...manifest().slideshow.pictures[0], caption: "a".repeat(81) }],
      }),
    ],
  ])("takes %s for a damaged file, naming the fault", (_, text) => {
    const reading = readManifest(text);
    expect(reading.kind).toBe("damaged");
    expect(reading.kind === "damaged" && reading.reason.length).toBeGreaterThan(0);
  });

  it("names a bad own motion's path, its value and what is expected, once", () => {
    const text = withSlideshow({
      pictures: [
        {
          ...manifest().slideshow.pictures[0],
          kenBurns: {
            from: { zoom: 9, centerX: 0.5, centerY: 0.5 },
            to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          },
        },
      ],
    });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.pictures[0].kenBurns.from.zoom: expected a number from 1 to 3, got 9",
    });
  });

  it("names a bad caption's path, its value and what is expected", () => {
    const text = withSlideshow({
      pictures: [{ ...manifest().slideshow.pictures[0], caption: "Am\nSteg" }],
    });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.pictures[0].caption: expected a single-line string of 1 to 80 characters without leading, trailing or repeated whitespace, got "Am\\nSteg"',
    });
  });
});
