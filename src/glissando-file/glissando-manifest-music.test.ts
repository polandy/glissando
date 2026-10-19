import { describe, expect, it } from "vitest";
import { GLISSANDO_FORMAT_VERSION, manifestFor } from "./glissando-manifest";
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
      width: 40,
      height: 30,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [
    {
      id: "m1",
      fileName: "Walzer.m4a",
      durationMs: 240_000,
      mimeType: "audio/mp4",
      trim: { startMs: 12_000, endMs: 200_000 },
      fadeInMs: 0,
      fadeOutMs: 5000,
      volumeDb: -3,
    },
  ],
  secondsPerPicture: 5,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

/** The written manifest with the song changed. */
function withSong(change: Record<string, unknown>): string {
  const written = manifest();
  const [song] = written.slideshow.songs;
  return asText({
    ...written,
    slideshow: { ...written.slideshow, songs: [{ ...song, ...change }] },
  });
}

describe("a song's excerpt and fades in the .glissando file", () => {
  it("are written as given", () => {
    expect(manifest().slideshow.songs[0]).toMatchObject({
      trim: { startMs: 12_000, endMs: 200_000 },
      fadeInMs: 0,
      fadeOutMs: 5000,
      volumeDb: -3,
    });
  });

  it("read back as written", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("are absent for the whole track with automatic fades", () => {
    const whole = manifestFor(
      {
        ...slideshow,
        songs: [{ id: "m1", fileName: "a.mp3", durationMs: 1000, mimeType: "audio/mpeg" }],
      },
      [JPEG],
    );

    expect(whole.slideshow.songs).toEqual([
      { file: "music/track-1.mp3", fileName: "a.mp3", durationMs: 1000, mimeType: "audio/mpeg" },
    ]);
  });

  it("make an older app report a file one format version newer as newer", () => {
    const text = asText({ ...manifest(), formatVersion: GLISSANDO_FORMAT_VERSION + 1 });
    expect(readManifest(text)).toEqual({ kind: "newer" });
  });

  it("name a bad excerpt's path, its value and what is expected", () => {
    expect(readManifest(withSong({ trim: { startMs: 0, endMs: 300_000 } }))).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.songs[0].trim: expected { startMs, endMs } in whole ms with 0 ≤ startMs, endMs ≤ 240000 and endMs − startMs ≥ 5000, got {"startMs":0,"endMs":300000}',
    });
  });

  it("name a bad fade's path, its value and what is expected", () => {
    expect(readManifest(withSong({ fadeOutMs: 1200 }))).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.songs[0].fadeOutMs: expected whole milliseconds from 0 to 10000 in steps of 500, got 1200",
    });
  });

  it("name a bad volume's path, its value and what is expected", () => {
    expect(readManifest(withSong({ volumeDb: 7 }))).toEqual({
      kind: "damaged",
      reason: "glissando.json slideshow.songs[0].volumeDb: expected whole dB from -12 to 6, got 7",
    });
  });

  it("take a track length off whole milliseconds for a damaged file, as the excerpt ends on it", () => {
    expect(readManifest(withSong({ durationMs: 240_000 })).kind).toBe("ok");
    expect(readManifest(withSong({ durationMs: 240_000.5 }))).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.songs[0].durationMs: expected a positive whole number of milliseconds, got 240000.5",
    });
  });
});
