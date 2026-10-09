import { describe, expect, it } from "vitest";
import { musicGainAt, musicTrackSeconds } from "./music-gain";

const MUSIC = { src: "m.mp3", startMs: 10_000, endMs: 30_000, fadeInMs: 2000, fadeOutMs: 4000 };

describe("musicGainAt (slideshow time; 0 is the excerpt's start)", () => {
  it.each([
    ["silent at the start of a fade-in", 0, 0],
    ["half way up the fade-in", 1000, 0.5],
    ["full between the fades", 10_000, 1],
    ["half way down the fade-out", 18_000, 0.5],
    ["silent at the end", 20_000, 0],
    ["silent after the end", 25_000, 0],
  ])("is %s", (_, timeMs, gain) => {
    expect(musicGainAt(MUSIC, timeMs)).toBeCloseTo(gain);
  });

  it("is full from the start without a fade-in", () => {
    expect(musicGainAt({ ...MUSIC, fadeInMs: 0 }, 0)).toBe(1);
  });

  it("is full to the track's end for a version 1 slideshow's music, which has no end", () => {
    const whole = { src: "m.mp3", startMs: 0, fadeInMs: 0, fadeOutMs: 0 };

    expect(musicGainAt(whole, 3_600_000)).toBe(1);
  });
});

describe("musicTrackSeconds", () => {
  it("maps slideshow time into the track from the excerpt's start", () => {
    expect(musicTrackSeconds(MUSIC, 2500)).toBe(12.5);
  });
});
