import { describe, expect, it } from "vitest";
import { MAX_VIDEO_EXCERPT_MS, MIN_VIDEO_EXCERPT_MS } from "../../library/own-video";
import {
  excerptAfterKey,
  excerptWithEnd,
  excerptWithStart,
  fractionToMs,
  HANDLE_STEP_MS,
} from "./clip-excerpt";

const SOURCE_MS = 20_000;
const MID = { startMs: 4000, endMs: 12_000 };

describe("excerptWithStart", () => {
  it("moves the start to the nearest step", () => {
    expect(excerptWithStart(SOURCE_MS, MID, 5040)).toEqual({ startMs: 5000, endMs: 12_000 });
  });

  it("stops at the clip's start", () => {
    expect(excerptWithStart(SOURCE_MS, MID, -300).startMs).toBe(0);
  });

  it("keeps the shortest excerpt before the end", () => {
    expect(excerptWithStart(SOURCE_MS, MID, 20_000).startMs).toBe(12_000 - MIN_VIDEO_EXCERPT_MS);
  });

  it("keeps the excerpt within the longest one by pulling the start up", () => {
    const long = { startMs: 0, endMs: MAX_VIDEO_EXCERPT_MS };
    const source = MAX_VIDEO_EXCERPT_MS * 2;

    expect(excerptWithStart(source, { startMs: 100_000, endMs: 100_000 + 1000 }, 0).startMs).toBe(
      0,
    );
    expect(excerptWithStart(source, long, 0)).toEqual(long);
  });
});

describe("excerptWithEnd", () => {
  it("moves the end to the nearest step", () => {
    expect(excerptWithEnd(SOURCE_MS, MID, 15_960)).toEqual({ startMs: 4000, endMs: 16_000 });
  });

  it("stops at the clip's end, even where it is no step", () => {
    expect(excerptWithEnd(19_950, MID, 25_000).endMs).toBe(19_950);
  });

  it("keeps the shortest excerpt after the start", () => {
    expect(excerptWithEnd(SOURCE_MS, MID, 0).endMs).toBe(4000 + MIN_VIDEO_EXCERPT_MS);
  });

  it("stops the excerpt at the longest one", () => {
    const source = MAX_VIDEO_EXCERPT_MS * 3;

    expect(excerptWithEnd(source, { startMs: 1000, endMs: 5000 }, source).endMs).toBe(
      1000 + MAX_VIDEO_EXCERPT_MS,
    );
  });
});

describe("excerptAfterKey", () => {
  it.each([
    ["start", "ArrowRight", false, { startMs: 4000 + HANDLE_STEP_MS, endMs: 12_000 }],
    ["start", "ArrowUp", false, { startMs: 4000 + HANDLE_STEP_MS, endMs: 12_000 }],
    ["start", "ArrowLeft", true, { startMs: 3000, endMs: 12_000 }],
    ["end", "ArrowDown", false, { startMs: 4000, endMs: 12_000 - HANDLE_STEP_MS }],
    ["end", "ArrowRight", true, { startMs: 4000, endMs: 13_000 }],
  ] as const)("moves the %s handle on %s (shift: %s)", (handle, key, shift, expected) => {
    expect(excerptAfterKey(handle, SOURCE_MS, MID, key, shift)).toEqual(expected);
  });

  it("jumps a handle to its limit on Home and End", () => {
    expect(excerptAfterKey("start", SOURCE_MS, MID, "Home", false)?.startMs).toBe(0);
    expect(excerptAfterKey("end", SOURCE_MS, MID, "End", false)?.endMs).toBe(SOURCE_MS);
  });

  it("leaves other keys alone", () => {
    expect(excerptAfterKey("start", SOURCE_MS, MID, "a", false)).toBeNull();
  });
});

describe("fractionToMs", () => {
  it("maps a place on the strip to the clip's time, within the clip", () => {
    expect(fractionToMs(0.25, SOURCE_MS)).toBe(5000);
    expect(fractionToMs(-1, SOURCE_MS)).toBe(0);
    expect(fractionToMs(2, SOURCE_MS)).toBe(SOURCE_MS);
  });
});
