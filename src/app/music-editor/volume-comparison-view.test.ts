import { describe, expect, it } from "vitest";
import { excerptLoudnessLufs, excerptPeakDbfs, levelSong, type MusicLoudness } from "../../loudness";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { LoudnessStatus } from "../loudness/music-loudness-known";
import { volumeComparisonView } from "./volume-comparison-view";

/** A loudness measurement that is the same throughout, long enough to cover a 60 s excerpt. */
function uniformLoudness(meanSquare: number, peak: number): MusicLoudness {
  const hops = 700;
  return { blockMeanSquares: new Float32Array(hops).fill(meanSquare), hopPeaks: new Float32Array(hops).fill(peak) };
}

const LOUD = uniformLoudness(0.03, 0.9);
const QUIET = uniformLoudness(0.002, 0.01);
// Below the absolute gate (−70 LUFS): `excerptLoudnessLufs` gates it out to `null`.
const SILENT = uniformLoudness(1e-10, 0);

function song(id: string, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs: 60_000, mimeType: "audio/mpeg", ...own };
}

function slideshow(songs: readonly StoredMusic[]): StoredSlideshow {
  const pictures: StoredPicture[] = [
    {
      id: "p0",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 1,
      height: 1,
      fileName: "p0.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ];
  return {
    id: "show",
    title: "Sommer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    songs,
  };
}

function known(loudness: MusicLoudness): LoudnessStatus {
  return { kind: "known", loudness };
}

describe("volumeComparisonView", () => {
  it("is unmeasured for a song absent from the loudness map", () => {
    const view = volumeComparisonView(slideshow([song("a")]), new Map());
    expect(view).toEqual([{ id: "a", number: 1, measured: false }]);
  });

  it("is unmeasured while a song is still being listened for", () => {
    const loudness = new Map([["a", { kind: "listening" } as const]]);
    const view = volumeComparisonView(slideshow([song("a")]), loudness);
    expect(view).toEqual([{ id: "a", number: 1, measured: false }]);
  });

  it("is unmeasured when an excerpt gates down to silence", () => {
    const loudness = new Map([["a", known(SILENT)]]);
    const view = volumeComparisonView(slideshow([song("a")]), loudness);
    expect(view).toEqual([{ id: "a", number: 1, measured: false }]);
  });

  it("positions a measured song's original and resolved loudness on the same axis", () => {
    const loudness = new Map([["a", known(LOUD)]]);
    const view = volumeComparisonView(slideshow([song("a")]), loudness);

    const originalLufs = excerptLoudnessLufs(LOUD, 0, 60_000) as number;
    const peakDbfs = excerptPeakDbfs(LOUD, 0, 60_000);
    const { gainDb } = levelSong({ loudnessLufs: originalLufs, peakDbfs, ownDb: 0 });
    const nowLufs = originalLufs + gainDb;
    const percent = (lufs: number) => Math.max(0, Math.min(100, ((lufs + 30) / 26) * 100));

    expect(view).toEqual([
      {
        id: "a",
        number: 1,
        measured: true,
        originalPercent: percent(originalLufs),
        nowPercent: percent(nowLufs),
        nowLufs,
        ownDb: 0,
        levelled: true,
      },
    ]);
  });

  it("carries a song's own volume into its resolved loudness and marks it not levelled", () => {
    const loudness = new Map([["a", known(QUIET)]]);
    const view = volumeComparisonView(slideshow([song("a", { volumeDb: 4 })]), loudness);

    const row = view[0];
    expect(row?.measured).toBe(true);
    if (row?.measured !== true) throw new Error("expected a measured row");
    expect(row).toMatchObject({ ownDb: 4, levelled: false });
    const loudOwnDb0 = volumeComparisonView(slideshow([song("a")]), loudness)[0];
    if (loudOwnDb0?.measured !== true) throw new Error("expected a measured row");
    expect(row.nowLufs).toBeGreaterThan(loudOwnDb0.nowLufs);
  });

  it("numbers rows by the songs' place in the playlist", () => {
    const view = volumeComparisonView(slideshow([song("a"), song("b")]), new Map());
    expect(view.map((row) => row.number)).toEqual([1, 2]);
  });
});
