import { describe, expect, it } from "vitest";
import { SEEK_STEP_SECONDS, seekBy, timelineSeconds } from "./seek";

describe("seekBy", () => {
  it("steps 5 s back and forth", () => {
    expect(SEEK_STEP_SECONDS).toBe(5);
    expect(seekBy(20, SEEK_STEP_SECONDS, 60)).toBe(25);
    expect(seekBy(20, -SEEK_STEP_SECONDS, 60)).toBe(15);
  });

  it("stays within the slideshow", () => {
    expect(seekBy(2, -SEEK_STEP_SECONDS, 60)).toBe(0);
    expect(seekBy(58, SEEK_STEP_SECONDS, 60)).toBe(60);
  });
});

describe("timelineSeconds", () => {
  const track = { left: 100, width: 200 };

  it("maps a point on the timeline to its share of the duration", () => {
    expect(timelineSeconds(150, track, 60)).toBe(15);
  });

  it("clamps a drag beyond either end", () => {
    expect(timelineSeconds(50, track, 60)).toBe(0);
    expect(timelineSeconds(400, track, 60)).toBe(60);
  });

  it("maps a timeline without width to the start", () => {
    expect(timelineSeconds(150, { left: 100, width: 0 }, 60)).toBe(0);
  });
});
