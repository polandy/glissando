import { describe, expect, it } from "vitest";
import { autoTransition } from "./auto-transition";
import { TRANSITION_EFFECTS } from "../player/slideshow";

describe("autoTransition", () => {
  it("has no transition on the last slide", () => {
    expect(autoTransition(2, 3, 5000)).toBeUndefined();
  });

  it("cycles through TRANSITION_EFFECTS in order", () => {
    const slideCount = TRANSITION_EFFECTS.length + 2;
    const effects = Array.from(
      { length: slideCount - 1 },
      (_, index) => autoTransition(index, slideCount, 5000)?.effect,
    );

    expect(effects).toEqual([...TRANSITION_EFFECTS, TRANSITION_EFFECTS[0]]);
  });

  it("never repeats the same effect on two consecutive slides", () => {
    const slideCount = TRANSITION_EFFECTS.length * 2 + 1;

    for (let index = 0; index < slideCount - 2; index++) {
      const current = autoTransition(index, slideCount, 5000);
      const next = autoTransition(index + 1, slideCount, 5000);
      expect(current?.effect).not.toBe(next?.effect);
    }
  });

  it("sets the transition to 30% of the slide duration", () => {
    expect(autoTransition(0, 2, 2000)?.durationMs).toBe(600);
  });

  it("rounds the transition duration to a whole millisecond", () => {
    expect(autoTransition(0, 2, 2001)?.durationMs).toBe(600);
  });

  it("caps the transition duration at 1000 ms on a long slide", () => {
    expect(autoTransition(0, 2, 10_000)?.durationMs).toBe(1000);
  });
});
