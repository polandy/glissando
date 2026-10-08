import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_VERSION,
  manifestFor,
  musicPath,
  picturePaths,
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
    { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 3840, height: 2160, fileName: "a.jpg" },
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
    },
  ],
  ownOrder: true,
  music: { id: "m1", fileName: "Walzer.m4a", durationMs: 240000, mimeType: "audio/mp4" },
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
    expect(written.formatVersion).toBe(2);
    expect(written.slideshow.pictures[0]).toEqual({
      file: "pictures/0001.jpg",
      thumbnail: "thumbnails/0001.jpg",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
    });
    expect(written.slideshow.music).toEqual({
      file: "music/track.m4a",
      fileName: "Walzer.m4a",
      durationMs: 240000,
      mimeType: "audio/mp4",
    });
    expect(written.slideshow.pictures[1]?.kenBurns).toEqual(slideshow.pictures[1]?.kenBurns);
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
    ["Walzer.M4A", "music/track.m4a"],
    ["no extension", "music/track"],
    ["odd.ex t", "music/track"],
  ])("puts music %j at %j", (fileName, expected) => {
    expect(musicPath(fileName)).toBe(expected);
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

  it("reads a version 1 file, which knows no own motions", () => {
    const written = manifest();
    const [first, second] = written.slideshow.pictures;
    const versionOne = {
      ...written,
      formatVersion: 1,
      slideshow: { ...written.slideshow, pictures: [first, { ...second, kenBurns: undefined }] },
    };

    const reading = readManifest(asText(versionOne));

    expect(reading.kind).toBe("ok");
    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[1]).toEqual({
      ...second,
      kenBurns: undefined,
    });
    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[1]).not.toHaveProperty(
      "kenBurns",
    );
  });

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
      "music without duration",
      withSlideshow({ music: { ...manifest().slideshow.music, durationMs: -1 } }),
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
  ])("takes %s for a damaged file, naming the fault", (_, text) => {
    const reading = readManifest(text);
    expect(reading.kind).toBe("damaged");
    expect(reading.kind === "damaged" && reading.reason.length).toBeGreaterThan(0);
  });
});
