import { describe, expect, it } from "vitest";
import type { Slide } from "../../player";
import {
  nextSlideStart,
  previousSlideStart,
  slideBoundaries,
  slideIndexAt,
} from "./slide-boundaries";

function slide(durationMs: number): Slide {
  const framing = { zoom: 1, centerX: 0.5, centerY: 0.5 };
  return {
    image: { src: "pictures/1.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: { from: framing, to: framing, easing: "linear" },
  };
}

/** Slides of 4 s, 5 s and 3 s: they start at 0 s, 4 s and 9 s and end at 12 s. */
const boundaries = slideBoundaries({ slides: [slide(4000), slide(5000), slide(3000)] });

describe("slide boundaries", () => {
  it("starts each slide where the previous ones end", () => {
    expect(boundaries.starts).toEqual([0, 4, 9]);
    expect(boundaries.duration).toBe(12);
  });

  it.each([
    [0, 0],
    [3.99, 0],
    [4, 1],
    [8.5, 1],
    [9, 2],
    [12, 2],
    [99, 2],
    [-1, 0],
  ])("at %d s shows slide index %d", (seconds, index) => {
    expect(slideIndexAt(boundaries, seconds)).toBe(index);
  });

  it.each([
    [0, 4],
    [4, 9],
    [6, 9],
  ])("next from %d s goes to the following slide's start at %d s", (seconds, start) => {
    expect(nextSlideStart(boundaries, seconds)).toBe(start);
  });

  it("has no next slide on the last one", () => {
    expect(nextSlideStart(boundaries, 10)).toBeNull();
  });

  it.each([
    [6, 4],
    [5.01, 4],
  ])("previous from %d s, more than a second in, restarts the slide at %d s", (seconds, start) => {
    expect(previousSlideStart(boundaries, seconds)).toBe(start);
  });

  it.each([
    [4.5, 0],
    [5, 0],
    [9.2, 4],
  ])(
    "previous from %d s, within the first second, goes to the slide before at %d s",
    (seconds, start) => {
      expect(previousSlideStart(boundaries, seconds)).toBe(start);
    },
  );

  it("previous on the first slide's first second stays at the start", () => {
    expect(previousSlideStart(boundaries, 0.5)).toBe(0);
  });
});
