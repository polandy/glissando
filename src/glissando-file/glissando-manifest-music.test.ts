import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_VERSION,
  MUSIC_TRIM_FROM_VERSION,
  manifestFor,
} from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 40, height: 30, fileName: "a.jpg" },
  ],
  music: {
    id: "m1",
    fileName: "Walzer.m4a",
    durationMs: 240_000,
    mimeType: "audio/mp4",
    trim: { startMs: 12_000, endMs: 200_000 },
    fadeInMs: 0,
    fadeOutMs: 5000,
  },
  secondsPerPicture: 5,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

/** The written manifest with the music changed and `formatVersion` set. */
function withMusic(change: Record<string, unknown>, formatVersion = MUSIC_TRIM_FROM_VERSION) {
  const written = manifest();
  return asText({
    ...written,
    formatVersion,
    slideshow: { ...written.slideshow, music: { ...written.slideshow.music, ...change } },
  });
}

describe("the music's excerpt and fades in the .glissando file", () => {
  it("are written as format version 5, the version that carries them", () => {
    expect(GLISSANDO_FORMAT_VERSION).toBe(5);
    expect(MUSIC_TRIM_FROM_VERSION).toBe(5);
    expect(manifest().slideshow.music).toMatchObject({
      trim: { startMs: 12_000, endMs: 200_000 },
      fadeInMs: 0,
      fadeOutMs: 5000,
    });
  });

  it("read back as written", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("are absent for the whole track with automatic fades", () => {
    const whole = manifestFor(
      {
        ...slideshow,
        music: { id: "m1", fileName: "a.mp3", durationMs: 1000, mimeType: "audio/mpeg" },
      },
      [JPEG],
    );

    expect(whole.slideshow.music).toEqual({
      file: "music/track.mp3",
      fileName: "a.mp3",
      durationMs: 1000,
      mimeType: "audio/mpeg",
    });
  });

  it("are no part of a version 4 file, which still reads", () => {
    const text = withMusic({ trim: undefined, fadeInMs: undefined, fadeOutMs: undefined }, 4);

    const reading = readManifest(text);

    expect(reading.kind === "ok" && reading.manifest.slideshow.music?.fileName).toBe("Walzer.m4a");
    expect(reading.kind === "ok" && reading.manifest.slideshow.music).not.toHaveProperty("trim");
  });

  it("take an excerpt in a version 4 file for a damaged file", () => {
    expect(readManifest(withMusic({ fadeInMs: undefined, fadeOutMs: undefined }, 4)).kind).toBe(
      "damaged",
    );
  });

  it("make an older app report a version 5 file as newer", () => {
    expect(readManifest(withMusic({}, GLISSANDO_FORMAT_VERSION + 1))).toEqual({ kind: "newer" });
  });

  it("name a bad excerpt's path, its value and what is expected", () => {
    expect(readManifest(withMusic({ trim: { startMs: 0, endMs: 300_000 } }))).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.music.trim: expected { startMs, endMs } in whole ms with 0 ≤ startMs, endMs ≤ 240000 and endMs − startMs ≥ 5000, got {"startMs":0,"endMs":300000}',
    });
  });

  it("name a bad fade's path, its value and what is expected", () => {
    expect(readManifest(withMusic({ fadeOutMs: 1200 }))).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.music.fadeOutMs: expected whole milliseconds from 0 to 10000 in steps of 500, got 1200",
    });
  });
});
