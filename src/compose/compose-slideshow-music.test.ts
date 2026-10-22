import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { parseSlideshow } from "../player/parse-slideshow";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";

function picture(id: string, capturedAt: string): StoredPicture {
  return {
    id,
    capturedAt,
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("composeSlideshow with music", () => {
  it("includes music when the stored slideshow has it", () => {
    const stored = storedSlideshow({
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" }],
    });

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(result.music).toEqual([
      {
        src: "music/m1.mp3",
        atMs: 0,
        startMs: 0,
        endMs: 10_000,
        fadeInMs: 0,
        fadeOutMs: 0,
        gain: 1,
      },
    ]);
  });

  it("plays the music's excerpt with its fades, resolved, and times the slides to it", () => {
    const stored = storedSlideshow({
      songs: [
        {
          id: "m1",
          fileName: "song.mp3",
          durationMs: 60_000,
          mimeType: "audio/mpeg",
          trim: { startMs: 12_000, endMs: 22_000 },
          fadeOutMs: 5000,
        },
      ],
    });

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(result.music).toEqual([
      {
        src: "music/m1.mp3",
        atMs: 0,
        startMs: 12_000,
        endMs: 22_000,
        fadeInMs: 2000,
        fadeOutMs: 5000,
        gain: 1,
      },
    ]);
    expect(result.slides.map((slide) => slide.durationMs)).toEqual([5000, 5000]);
  });

  it("plays the playlist's songs, each placed where it starts, the pictures filling it", () => {
    const song = (id: string) => ({
      id,
      fileName: `${id}.mp3`,
      durationMs: 10_000,
      mimeType: "audio/mpeg",
    });
    const stored = storedSlideshow({ songs: [song("m1"), song("m2")] });

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(result.music).toEqual([
      {
        src: "music/m1.mp3",
        atMs: 0,
        startMs: 0,
        endMs: 10_000,
        fadeInMs: 0,
        fadeOutMs: 3000,
        gain: 1,
      },
      {
        src: "music/m2.mp3",
        atMs: 7000,
        startMs: 0,
        endMs: 10_000,
        fadeInMs: 3000,
        fadeOutMs: 0,
        gain: 1,
      },
    ]);
    expect(result.slides.map((slide) => slide.durationMs)).toEqual([8500, 8500]);
    expect(parseSlideshow(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });

  it("leaves out the songs a slideshow lasting its own seconds never reaches", () => {
    const song = (id: string) => ({
      id,
      fileName: `${id}.mp3`,
      durationMs: 60_000,
      mimeType: "audio/mpeg",
    });
    const stored = storedSlideshow({
      songs: [song("m1"), song("m2")],
      pictureLength: "seconds",
    });

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(result.music).toEqual([
      {
        src: "music/m1.mp3",
        atMs: 0,
        startMs: 0,
        endMs: 10_000,
        fadeInMs: 0,
        fadeOutMs: 2000,
        gain: 1,
      },
    ]);
  });

  it("omits music when the stored slideshow has none", () => {
    const result = composeSlideshow(
      storedSlideshow(),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(result.music).toBeUndefined();
    expect("music" in result).toBe(false);
  });

  it("produces a slideshow that parseSlideshow accepts unchanged, for an even music split", () => {
    const stored = storedSlideshow({
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
        picture("d", "2025-07-04T10:00:00Z"),
      ],
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 8000, mimeType: "audio/mpeg" }],
    });

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );
    const roundTripped = parseSlideshow(JSON.parse(JSON.stringify(result)));

    expect(roundTripped).toEqual(result);
    const total = result.slides.reduce((sum, slide) => sum + slide.durationMs, 0);
    expect(total).toBe(8000);
  });

  it("produces a slideshow that parseSlideshow accepts unchanged, for an uneven music split", () => {
    const stored = storedSlideshow({
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
      ],
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" }],
    });

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );
    const roundTripped = parseSlideshow(JSON.parse(JSON.stringify(result)));

    expect(roundTripped).toEqual(result);
    const total = result.slides.reduce((sum, slide) => sum + slide.durationMs, 0);
    expect(total).toBe(10_000);
  });
});
