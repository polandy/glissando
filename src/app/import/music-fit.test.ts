import { describe, expect, it } from "vitest";
import { playlistMs, type Playlist } from "../../compose";
import { importTiming, ownDurationsMs } from "./music-fit";

const photos = (count: number): undefined[] => Array.from({ length: count }, () => undefined);

describe("importTiming", () => {
  it("without music every picture stays the chosen seconds", () => {
    expect(importTiming(photos(12), undefined, 4.5, undefined)).toEqual({
      perPictureSeconds: 4.5,
      totalSeconds: 54,
      music: null,
    });
  });

  it("counts a video as its excerpt, whatever the seconds per picture", () => {
    expect(importTiming([undefined, 20_000], undefined, 5, undefined)).toEqual({
      perPictureSeconds: 12.5,
      totalSeconds: 25,
      music: null,
    });
  });

  it("lets the pictures that fill the music share what its videos leave", () => {
    expect(
      importTiming([undefined, 20_000], { durationMs: 60_000, filled: true }, 5, undefined),
    ).toEqual({
      perPictureSeconds: 30,
      totalSeconds: 60,
      music: { kind: "ends-with", seconds: 60 },
    });
  });

  it("with music the pictures stay their seconds, and a longer song fades out with them", () => {
    expect(importTiming(photos(4), { durationMs: 60_000, filled: false }, 5, undefined)).toEqual({
      perPictureSeconds: 5,
      totalSeconds: 20,
      music: { kind: "fades-out", seconds: 60 },
    });
  });

  it("shrinks own-seconds pictures to end with a shorter playlist instead of outlasting it (ADR-0047)", () => {
    expect(importTiming(photos(10), { durationMs: 44_000, filled: false }, 5, undefined)).toEqual({
      perPictureSeconds: 4.4,
      totalSeconds: 44,
      music: { kind: "fitted", seconds: 44, shareSeconds: 4.4 },
    });
  });

  it("keeps own seconds and ends in silence when even the shrunk share falls short, without a repeat (ADR-0047)", () => {
    expect(importTiming(photos(4), { durationMs: 12_000, filled: false }, 5, undefined)).toEqual({
      perPictureSeconds: 5,
      totalSeconds: 20,
      music: { kind: "silent-after", seconds: 12 },
    });
  });

  it("repeats the music from its first song instead of ending in silence once asked to (ADR-0047)", () => {
    expect(importTiming(photos(4), { durationMs: 12_000, filled: false }, 5, true)).toEqual({
      perPictureSeconds: 5,
      totalSeconds: 20,
      music: { kind: "repeats", seconds: 12 },
    });
  });

  it("the repeated music's seconds is the once-through playlist length, which stays repeat-unaware (ADR-0047)", () => {
    const playlist: Playlist = {
      songs: [{ id: "s1", fileName: "song.mp3", durationMs: 12_000, mimeType: "audio/mpeg" }],
    };
    const onceThroughMs = playlistMs(playlist);

    expect(
      importTiming(photos(4), { durationMs: onceThroughMs ?? 0, filled: false }, 5, true).music,
    ).toEqual({ kind: "repeats", seconds: 12 });
  });

  it("with music the pictures fill, they share the track's length", () => {
    expect(importTiming(photos(4), { durationMs: 60_000, filled: true }, 5, undefined)).toEqual({
      perPictureSeconds: 15,
      totalSeconds: 60,
      music: { kind: "ends-with", seconds: 60 },
    });
  });

  it("with music too short for the pictures that fill it every picture gets the minimum", () => {
    expect(importTiming(photos(10), { durationMs: 5_000, filled: true }, 5, undefined)).toEqual({
      perPictureSeconds: 2,
      totalSeconds: 20,
      music: { kind: "silent-after", seconds: 5 },
    });
  });

  it("repeats the music even when filling it floors every picture at the minimum (ADR-0047)", () => {
    expect(importTiming(photos(10), { durationMs: 5_000, filled: true }, 5, true)).toEqual({
      perPictureSeconds: 2,
      totalSeconds: 20,
      music: { kind: "repeats", seconds: 5 },
    });
  });
});

describe("ownDurationsMs", () => {
  it("gives a video its excerpt and a photo none", () => {
    const video = { mediaId: "v", sourceMs: 9000, startMs: 1000, endMs: 4000 };

    expect(ownDurationsMs([{}, { video }])).toEqual([undefined, 3000]);
  });
});
