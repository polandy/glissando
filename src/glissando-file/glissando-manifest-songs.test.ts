import { describe, expect, it } from "vitest";
import { setBetweenSongs } from "../library/slideshow-edits-songs";
import { SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import type { StoredSlideshow } from "../library/stored-slideshow";
import {
  GLISSANDO_FORMAT_VERSION,
  OLDEST_READABLE_FORMAT_VERSION,
  manifestFor,
} from "./glissando-manifest";
import { readManifest } from "./read-manifest";

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };

const noSongs: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    { id: "p1", capturedAt: "2025-09-30T10:00:00Z", width: 40, height: 30, fileName: "a.jpg" },
  ],
  songs: [],
  secondsPerPicture: 5,
};

const playlist: StoredSlideshow = {
  ...noSongs,
  songs: [
    { id: "m1", fileName: "Walzer.m4a", durationMs: 240_000, mimeType: "audio/mp4" },
    { id: "m2", fileName: "Polka.mp3", durationMs: 180_000, mimeType: "audio/mpeg" },
  ],
  betweenSongs: SEQUENCE_BETWEEN_SONGS,
};

const manifest = (slideshow: StoredSlideshow) => manifestFor(slideshow, [JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

describe("the playlist in the .glissando file (ADR-0023)", () => {
  it("is written from format version 10, the oldest version this app still reads", () => {
    expect(GLISSANDO_FORMAT_VERSION).toBe(10);
    expect(OLDEST_READABLE_FORMAT_VERSION).toBe(10);
    expect(manifest(playlist).formatVersion).toBe(10);
  });

  it("gives each song a path unique to its place in the playlist", () => {
    expect(manifest(playlist).slideshow.songs.map((song) => song.file)).toEqual([
      "music/track-1.m4a",
      "music/track-2.mp3",
    ]);
  });

  it("writes an empty playlist, not an absent one, for a slideshow without music", () => {
    const written = manifest(noSongs);
    expect(written.slideshow.songs).toEqual([]);
    expect(written.slideshow).not.toHaveProperty("betweenSongs");
  });

  it("carries betweenSongs only when the slideshow plays its songs one after another", () => {
    expect(manifest(playlist).slideshow.betweenSongs).toBe("sequence");
    const crossfading = setBetweenSongs(playlist, undefined);
    expect(manifest(crossfading).slideshow).not.toHaveProperty("betweenSongs");
  });

  it("reads back a playlist of several songs and betweenSongs as written", () => {
    expect(readManifest(asText(manifest(playlist)))).toEqual({
      kind: "ok",
      manifest: manifest(playlist),
    });
  });

  it("refuses a file older than format version 10, which carried a single music, not songs", () => {
    const written = manifest(playlist);
    const text = asText({ ...written, formatVersion: 9 });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: "glissando.json formatVersion: expected a whole number from 10 to 10, got 9",
    });
  });

  it("refuses two songs at the same path, naming the second and its path", () => {
    const written = manifest(playlist);
    const [first] = written.slideshow.songs;
    const text = asText({
      ...written,
      slideshow: { ...written.slideshow, songs: [first, first] },
    });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: `glissando.json slideshow.songs[1].file: expected a path no other song uses, got ${JSON.stringify(first?.file)}`,
    });
  });

  it("make an older app report a version 11 file as newer", () => {
    expect(readManifest(asText({ ...manifest(playlist), formatVersion: 11 }))).toEqual({
      kind: "newer",
    });
  });
});
