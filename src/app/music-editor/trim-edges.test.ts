import { describe, expect, it } from "vitest";
import {
  ARROW_STEP_MS,
  ARROW_STEP_LARGE_MS,
  canStepTrimEdge,
  moveTrimEdge,
  nearerEdge,
  stepTrimEdge,
} from "./trim-edges";

const TRACK_MS = 204_000;
const TRIM = { startMs: 12_000, endMs: 150_000 };

describe("moveTrimEdge", () => {
  it("snaps the moved edge to a tenth of a second", () => {
    expect(moveTrimEdge(TRIM, "start", 20_049, TRACK_MS)).toEqual({
      startMs: 20_000,
      endMs: 150_000,
    });
    expect(moveTrimEdge(TRIM, "end", 99_951, TRACK_MS)).toEqual({
      startMs: 12_000,
      endMs: 100_000,
    });
  });

  it("keeps the edges within the track", () => {
    expect(moveTrimEdge(TRIM, "start", -3000, TRACK_MS).startMs).toBe(0);
    expect(moveTrimEdge(TRIM, "end", 250_000, TRACK_MS).endMs).toBe(TRACK_MS);
  });

  it("keeps the excerpt at least 5 s long, holding the other edge", () => {
    expect(moveTrimEdge(TRIM, "start", 149_000, TRACK_MS)).toEqual({
      startMs: 145_000,
      endMs: 150_000,
    });
    expect(moveTrimEdge(TRIM, "end", 13_000, TRACK_MS)).toEqual({ startMs: 12_000, endMs: 17_000 });
  });

  it("leaves a track shorter than 5 s whole, as no excerpt of it is long enough", () => {
    const shortTrack = { startMs: 0, endMs: 3000 };

    expect(moveTrimEdge(shortTrack, "start", 1000, 3000)).toEqual(shortTrack);
    expect(moveTrimEdge(shortTrack, "end", 2000, 3000)).toEqual(shortTrack);
    expect(canStepTrimEdge(shortTrack, "start", "later", 3000)).toBe(false);
    expect(canStepTrimEdge(shortTrack, "end", "earlier", 3000)).toBe(false);
  });
});

describe("stepTrimEdge", () => {
  it("steps an edge by half a second either way", () => {
    expect(stepTrimEdge(TRIM, "start", "later", TRACK_MS).startMs).toBe(12_500);
    expect(stepTrimEdge(TRIM, "end", "earlier", TRACK_MS).endMs).toBe(149_500);
  });

  it("arrow keys step a tenth, a second with Shift", () => {
    expect(ARROW_STEP_MS).toBe(100);
    expect(ARROW_STEP_LARGE_MS).toBe(1000);
  });
});

describe("nearerEdge", () => {
  it.each([
    [5000, "start"],
    [80_000, "start"],
    [82_000, "end"],
    [190_000, "end"],
  ] as const)("at %i ms grabs the %s", (atMs, edge) => {
    expect(nearerEdge(TRIM, atMs)).toBe(edge);
  });
});
