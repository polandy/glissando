import { describe, expect, it } from "vitest";
import { isTrackHeardAt, musicGainAt, trackGainAt, trackSecondsAt } from "./music-gain";

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
});

describe("trackSecondsAt", () => {
  it("maps slideshow time into the track from its place and its excerpt's start", () => {
    expect(trackSecondsAt({ ...MUSIC, atMs: 4000 }, 6500)).toBe(12.5);
  });
});

describe("isTrackHeardAt (the track sounds from its atMs for the excerpt's length)", () => {
  const PLACED = { ...MUSIC, atMs: 60_000 };

  it.each([
    ["not before its place", 59_999, false],
    ["at its place", 60_000, true],
    ["until just before its end", 79_999, true],
    ["not at its end", 80_000, false],
  ])("is heard %s", (_, timeMs, heard) => {
    expect(isTrackHeardAt(PLACED, timeMs)).toBe(heard);
  });
});

describe("trackGainAt (slideshow time; the track starts at its atMs)", () => {
  const PLACED = { ...MUSIC, atMs: 60_000 };

  it.each([
    ["silent before the track starts", 59_000, 0],
    ["silent where it starts, at the foot of its fade-in", 60_000, 0],
    ["half way up its fade-in", 61_000, 0.5],
    ["full between its fades", 70_000, 1],
    ["half way down its fade-out", 78_000, 0.5],
    ["silent after its end", 80_000, 0],
  ])("is %s", (_, timeMs, gain) => {
    expect(trackGainAt(PLACED, timeMs)).toBeCloseTo(gain);
  });
});
