import { describe, expect, it } from "vitest";
import {
  InvalidOwnMusicError,
  MUSIC_FADE_CHOICES_MS,
  checkMusicFadeMs,
  checkMusicTrim,
} from "./own-music";

const TRACK_MS = 204_000;

describe("checkMusicTrim", () => {
  it.each([
    ["the whole track", { startMs: 0, endMs: TRACK_MS }],
    ["an excerpt in the middle", { startMs: 12_300, endMs: 150_000 }],
    ["exactly the 5 s minimum", { startMs: 1000, endMs: 6000 }],
  ])("accepts %s", (_, trim) => {
    expect(checkMusicTrim(trim, TRACK_MS, "music")).toEqual(trim);
  });

  it.each([
    ["a start before the track", { startMs: -1, endMs: 10_000 }],
    ["an end past the track", { startMs: 0, endMs: TRACK_MS + 1 }],
    ["an excerpt shorter than 5 s", { startMs: 1000, endMs: 5999 }],
    ["an end before the start", { startMs: 10_000, endMs: 2000 }],
    ["no whole milliseconds", { startMs: 0.5, endMs: 10_000 }],
    ["a missing end", { startMs: 0 }],
    ["an unknown key", { startMs: 0, endMs: 10_000, loop: true }],
    ["no object", "0-10000"],
  ])("refuses %s, naming the field", (_, value) => {
    expect(() => checkMusicTrim(value, TRACK_MS, "music")).toThrow(InvalidOwnMusicError);
    expect(() => checkMusicTrim(value, TRACK_MS, "music")).toThrow("music trim");
  });
});

describe("checkMusicFadeMs", () => {
  it("offers off, short (2 s) and long (5 s)", () => {
    expect(MUSIC_FADE_CHOICES_MS).toEqual([0, 2000, 5000]);
  });

  it.each([0, 500, 2000, 5000, 10_000])("accepts %i ms: 0 to 10 s on the half second", (ms) => {
    expect(checkMusicFadeMs(ms, "fadeInMs", "music")).toBe(ms);
  });

  it.each([
    ["longer than 10 s", 10_500],
    ["negative", -500],
    ["off the half-second grid", 1200],
    ["no number", "2000"],
  ])("refuses a fade %s, naming the field", (_, value) => {
    expect(() => checkMusicFadeMs(value, "fadeOutMs", "music")).toThrow(InvalidOwnMusicError);
    expect(() => checkMusicFadeMs(value, "fadeOutMs", "music")).toThrow("music fadeOutMs");
  });
});
