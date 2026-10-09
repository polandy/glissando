import { describe, expect, it } from "vitest";
import { musicGainRamps } from "./music-ramps";

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
    const music = { startMs: 0, fadeInMs: 0, fadeOutMs: 0 };

    expect(musicGainRamps(music, 30_000, 60_000)).toEqual([
      { atMs: 0, gain: 1, kind: "set" },
      { atMs: 30_000, gain: 1, kind: "ramp" },
    ]);
  });
});
