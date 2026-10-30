import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "../../compose/energy/testing/synthetic-loudness";
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

function timedPictures(count: number, durationMs: number): StoredPicture[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    durationMs,
  }));
}

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
        laneAtMs: 0,
        laneMs: 60_000,
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
        laneAtMs: 57_000,
        laneMs: 60_000,
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
        laneAtMs: 114_000,
        laneMs: 60_000,
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

  describe("the pictures fit a shorter music, or it repeats (ADR-0047)", () => {
    it("shrinks the automatic pictures to end with the music, and gives their mean share", () => {
      const view = playlistView(
        slideshow([song("a", 24_000)], 5, { pictureLength: "seconds", secondsPerPicture: 6 }),
        new Map(),
      );

      expect(view).toMatchObject({
        repeatMusic: false,
        fittedShareMs: 4800,
        playlistMs: 24_000,
        slideshowMs: 24_000,
      });
      expect(view.overMs).toBeUndefined();
    });

    it("does not call it fitted once the shrink would still fall short (the ⅔ floor)", () => {
      // 5 pictures at 6 s each (floor 4 s) outlast 15 s even shrunk: 15 000 / 5 = 3000 < 4000.
      const view = playlistView(
        slideshow([song("b", 15_000)], 5, { pictureLength: "seconds", secondsPerPicture: 6 }),
        new Map(),
      );

      expect(view).toMatchObject({ repeatMusic: false, overMs: 15_000 });
      expect(view.fittedShareMs).toBeUndefined();
    });

    it("repeats the playlist from its first song while pictures remain", () => {
      const songs = [song("x", 20_000), song("y", 20_000)];
      const view = playlistView(
        slideshow(songs, 10, { repeatMusic: true, pictures: timedPictures(10, 5000) }),
        new Map(),
      );

      expect(view.slideshowMs).toBe(50_000);
      expect(view.playlistMs).toBe(37_000);
      expect(
        view.songs.map(({ id, number, atMs, repeated }) => ({
          id,
          number,
          atMs,
          repeated,
        })),
      ).toEqual([
        { id: "x", number: 1, atMs: 0, repeated: undefined },
        { id: "y", number: 2, atMs: 17_000, repeated: undefined },
        { id: "x", number: 1, atMs: 34_000, repeated: true },
        { id: "y", number: 2, atMs: 51_000, repeated: true },
      ]);
      // The loop boundary (index 1 → 2) joins exactly like any other crossfade.
      expect(view.crossfades).toEqual([
        { atMs: 17_000, ms: 3000 },
        { atMs: 34_000, ms: 3000 },
        { atMs: 51_000, ms: 3000 },
      ]);
      expect(view.overMs).toBeUndefined();
      expect(view.fittedShareMs).toBeUndefined();
    });

    it("counts the stored songs only, not their repeated entries", () => {
      const view = playlistView(
        slideshow([song("a", 9_000)], 10, { repeatMusic: true, pictures: timedPictures(10, 5000) }),
        new Map(),
      );

      // Several blocks play the one song again and again, but only one song is stored.
      expect(view.songs.length).toBeGreaterThan(1);
      expect(view.songCount).toBe(1);
    });
  });

  describe("energy pacing (ADR-0046)", () => {
    const quietThenLoud = song("m", 20_000);
    const loudness = new Map([
      [
        "m",
        {
          kind: "known" as const,
          loudness: syntheticLoudness([...levelMs(-24, 10_000), ...levelMs(-16, 10_000)]),
        },
      ],
    ]);

    it("paces the slide changes by the music's energy once the slideshow follows it", () => {
      const paced = playlistView(
        slideshow([quietThenLoud], 4, { energyPacing: true }),
        new Map(),
        loudness,
      );
      const even = playlistView(slideshow([quietThenLoud], 4), new Map(), loudness);

      // The first slide sits in the quiet half: quiet stretches it past the even 5000 ms gap.
      expect(paced.slideChangesMs[0]).toBeGreaterThan(even.slideChangesMs[0] as number);
    });
  });
});

function silentLoudness() {
  return { blockMeanSquares: new Float32Array(), hopPeaks: new Float32Array() };
}
