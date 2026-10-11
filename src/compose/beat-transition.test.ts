import { describe, expect, it } from "vitest";
import { beatTransitionDurationMs } from "./beat-transition";

describe("beatTransitionDurationMs", () => {
  it("lasts the most whole beats that fit the usual duration, so it starts on a beat", () => {
    expect(beatTransitionDurationMs(8000, 1000, [7200, 7600, 8000, 8400])).toBe(800);
  });

  it("counts the beats back along the ones found, which may be uneven", () => {
    expect(beatTransitionDurationMs(8000, 1000, [6900, 7300, 7650, 8000])).toBe(700);
  });

  it("may last the usual duration exactly", () => {
    expect(beatTransitionDurationMs(8000, 1000, [7000, 7500, 8000])).toBe(1000);
  });

  it("keeps the usual duration when one beat is longer than it", () => {
    expect(beatTransitionDurationMs(8000, 1000, [6800, 8000])).toBe(1000);
  });

  it("keeps the usual duration for a slide that does not end on a beat", () => {
    expect(beatTransitionDurationMs(8100, 1000, [7200, 7600, 8000, 8400])).toBe(1000);
  });
});
