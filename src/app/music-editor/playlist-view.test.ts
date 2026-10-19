import { describe, expect, it } from "vitest";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { playlistView } from "./playlist-view";

function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

function slideshow(songs: StoredMusic[], count: number, own: Partial<StoredSlideshow> = {}) {
  const pictures: StoredPicture[] = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  }));
  return {
    id: "show",
    title: "Sommer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    songs,
    ...own,
  } satisfies StoredSlideshow;
}

const SONGS = [
  song("a", 60_000),
  song("b", 90_000, { trim: { startMs: 10_000, endMs: 70_000 } }),
  song("c", 60_000),
];

describe("playlistView (ADR-0023)", () => {
  it("lists every song where it starts, its excerpt and the crossfades between", () => {
    const view = playlistView(slideshow(SONGS, 6), new Map());

    expect(view.songs).toEqual([
      {
        id: "a",
        number: 1,
        fileName: "a.mp3",
        durationMs: 60_000,
        excerptMs: 60_000,
        trimmed: false,
        atMs: 0,
        reached: true,
        volumeBadge: { kind: "measuring" },
      },
      {
        id: "b",
        number: 2,
        fileName: "b.mp3",
        durationMs: 90_000,
        excerptMs: 60_000,
        trimmed: true,
        atMs: 57_000,
        reached: true,
        volumeBadge: { kind: "measuring" },
      },
      {
        id: "c",
        number: 3,
        fileName: "c.mp3",
        durationMs: 60_000,
        excerptMs: 60_000,
        trimmed: false,
        atMs: 114_000,
        reached: true,
        volumeBadge: { kind: "measuring" },
      },
    ]);
    expect(view.crossfades).toEqual([
      { atMs: 57_000, ms: 3000 },
      { atMs: 114_000, ms: 3000 },
    ]);
    expect(view).toMatchObject({ crossfade: true, playlistMs: 174_000, slideshowMs: 174_000 });
    expect(view.slideChangesMs).toEqual([29_000, 58_000, 87_000, 116_000, 145_000]);
  });

  it("plays the songs one after another without crossfades", () => {
    const view = playlistView(
      slideshow(SONGS, 6, { betweenSongs: SEQUENCE_BETWEEN_SONGS }),
      new Map(),
    );

    expect(view.songs.map(({ atMs }) => atMs)).toEqual([0, 60_000, 120_000]);
    expect(view.crossfades).toEqual([]);
    expect(view).toMatchObject({ crossfade: false, playlistMs: 180_000 });
  });

  it("dims the songs a short slideshow never reaches", () => {
    const view = playlistView(slideshow(SONGS, 12, { pictureLength: "seconds" }), new Map());

    expect(view.slideshowMs).toBe(60_000);
    expect(view.songs.map(({ reached }) => reached)).toEqual([true, true, false]);
  });

  it("has no songs and no playlist without music", () => {
    expect(playlistView(slideshow([], 3), new Map())).toMatchObject({
      songs: [],
      crossfades: [],
      playlistMs: 0,
      slideshowMs: 15_000,
    });
  });

  describe("volume badge (ADR-0040)", () => {
    const songs = [song("a", 60_000, { volumeDb: 3 }), song("b", 60_000)];
    const known = { kind: "known" as const, loudness: silentLoudness() };

    it("badges a song still being listened for as measuring, own volume or not", () => {
      const view = playlistView(slideshow(songs, 6), new Map());
      expect(view.songs.map((s) => s.volumeBadge)).toEqual([
        { kind: "measuring" },
        { kind: "measuring" },
      ]);
    });

    it("badges a measured song by its own volume, once known", () => {
      const loudness = new Map([
        ["a", known],
        ["b", known],
      ]);
      const view = playlistView(slideshow(songs, 6), new Map(), loudness);
      expect(view.songs.map((s) => s.volumeBadge)).toEqual([
        { kind: "own", ownDb: 3 },
        { kind: "none" },
      ]);
    });
  });
});

function silentLoudness() {
  return { blockMeanSquares: new Float32Array(), hopPeaks: new Float32Array() };
}
