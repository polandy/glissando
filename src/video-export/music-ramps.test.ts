import { describe, expect, it } from "vitest";
import { musicGainRamps, scaleGainPoints, trackGainRamps } from "./music-ramps";

/** Heard from 10 s to 70 s of the track: 60 s, fading in 2 s and out 4 s. */
const MUSIC = { startMs: 10_000, endMs: 70_000, fadeInMs: 2000, fadeOutMs: 4000 };

describe("musicGainRamps", () => {
  it("follows the fade-in and holds full volume, as linear ramps from the segment's start", () => {
    expect(musicGainRamps(MUSIC, 0, 30_000)).toEqual([
      { atMs: 0, gain: 0, kind: "set" },
      { atMs: 2000, gain: 1, kind: "ramp" },
      { atMs: 30_000, gain: 1, kind: "ramp" },
    ]);
  });

  it("starts a later segment at the envelope's value and fades out to silence at the end", () => {
    expect(musicGainRamps(MUSIC, 30_000, 90_000)).toEqual([
      { atMs: 0, gain: 1, kind: "set" },
      { atMs: 26_000, gain: 1, kind: "ramp" },
      { atMs: 30_000, gain: 0, kind: "ramp" },
      { atMs: 60_000, gain: 0, kind: "ramp" },
    ]);
  });

  it("starts mid-fade at the fade's value", () => {
    expect(musicGainRamps(MUSIC, 1000, 1500)).toEqual([
      { atMs: 0, gain: 0.5, kind: "set" },
      { atMs: 500, gain: 0.75, kind: "ramp" },
    ]);
  });

  it("cuts to silence at the music's end without a fade-out", () => {
    const music = { ...MUSIC, fadeOutMs: 0 };

    expect(musicGainRamps(music, 50_000, 70_000)).toEqual([
      { atMs: 0, gain: 1, kind: "set" },
      { atMs: 10_000, gain: 1, kind: "ramp" },
      { atMs: 10_000, gain: 0, kind: "set" },
      { atMs: 20_000, gain: 0, kind: "ramp" },
    ]);
  });

  it("peaks where overlapping fades cross, for music shorter than both fades", () => {
    const music = { startMs: 0, endMs: 3000, fadeInMs: 2000, fadeOutMs: 2000 };

    expect(musicGainRamps(music, 0, 3000)).toEqual([
      { atMs: 0, gain: 0, kind: "set" },
      { atMs: 1000, gain: 0.5, kind: "ramp" },
      { atMs: 1500, gain: 0.75, kind: "ramp" },
      { atMs: 2000, gain: 0.5, kind: "ramp" },
      { atMs: 3000, gain: 0, kind: "ramp" },
    ]);
  });

  it("holds full volume for music heard to its end without fades", () => {
    const music = { startMs: 0, endMs: 3_600_000, fadeInMs: 0, fadeOutMs: 0 };

    expect(musicGainRamps(music, 30_000, 60_000)).toEqual([
      { atMs: 0, gain: 1, kind: "set" },
      { atMs: 30_000, gain: 1, kind: "ramp" },
    ]);
  });
});

describe("trackGainRamps (slideshow time; the track starts at its atMs)", () => {
  it("follows the track's own envelope from its place", () => {
    expect(trackGainRamps({ ...MUSIC, atMs: 60_000 }, 60_000, 90_000)).toEqual(
      musicGainRamps(MUSIC, 0, 30_000),
    );
  });

  it("is silent up to its place, then jumps to its envelope there", () => {
    const track = { ...MUSIC, atMs: 10_000, fadeInMs: 0 };

    expect(trackGainRamps(track, 0, 30_000)).toEqual([
      { atMs: 0, gain: 0, kind: "set" },
      { atMs: 10_000, gain: 1, kind: "set" },
      { atMs: 30_000, gain: 1, kind: "ramp" },
    ]);
  });

  it("starts its fade-in at its place, inside the window", () => {
    expect(trackGainRamps({ ...MUSIC, atMs: 10_000 }, 0, 30_000)).toEqual([
      { atMs: 0, gain: 0, kind: "set" },
      { atMs: 10_000, gain: 0, kind: "set" },
      { atMs: 12_000, gain: 1, kind: "ramp" },
      { atMs: 30_000, gain: 1, kind: "ramp" },
    ]);
  });

  it("is silent in a window ending where it starts", () => {
    expect(trackGainRamps({ ...MUSIC, atMs: 30_000, fadeInMs: 0 }, 0, 30_000)).toEqual([
      { atMs: 0, gain: 0, kind: "set" },
    ]);
  });
});

describe("scaleGainPoints", () => {
  it("multiplies every point's gain by the factor (ADR-0040's levelling), keeping its place and kind", () => {
    const points = [
      { atMs: 0, gain: 0.5, kind: "set" as const },
      { atMs: 2000, gain: 1, kind: "ramp" as const },
    ];

    expect(scaleGainPoints(points, 1.5)).toEqual([
      { atMs: 0, gain: 0.75, kind: "set" },
      { atMs: 2000, gain: 1.5, kind: "ramp" },
    ]);
  });

  it("leaves the points unchanged at a factor of 1", () => {
    const points = [{ atMs: 0, gain: 0.5, kind: "set" as const }];

    expect(scaleGainPoints(points, 1)).toEqual(points);
  });
});
