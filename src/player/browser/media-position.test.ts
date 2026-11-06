import { describe, expect, it } from "vitest";
import {
  HAVE_CURRENT_DATA,
  HAVE_ENOUGH_DATA,
  HAVE_FUTURE_DATA,
  playingSecondsOf,
} from "./media-position";

const PLAYING = { paused: false, seeking: false, readyState: HAVE_FUTURE_DATA, currentTime: 4.5 };

describe("playingSecondsOf", () => {
  it.each([
    ["HAVE_FUTURE_DATA", HAVE_FUTURE_DATA],
    ["HAVE_ENOUGH_DATA", HAVE_ENOUGH_DATA],
  ])("is the current time while playing with %s", (_, readyState) => {
    expect(playingSecondsOf({ ...PLAYING, readyState })).toBe(4.5);
  });

  it.each([
    ["paused", { paused: true }],
    ["seeking", { seeking: true }],
    ["short of future data", { readyState: HAVE_CURRENT_DATA }],
  ])("is null while %s", (_, change) => {
    expect(playingSecondsOf({ ...PLAYING, ...change })).toBeNull();
  });
});
