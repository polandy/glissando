import { describe, expect, it } from "vitest";
import { autoTransitionEffect, transitionDurationMs } from "./auto-transition";
import { TRANSITION_EFFECTS } from "../player/slideshow";

describe("autoTransitionEffect", () => {
  it("cycles through TRANSITION_EFFECTS in order", () => {
    const effects = Array.from({ length: TRANSITION_EFFECTS.length + 1 }, (_, index) =>
      autoTransitionEffect(index),
    );

    expect(effects).toEqual([...TRANSITION_EFFECTS, TRANSITION_EFFECTS[0]]);
  });

  it("never repeats the same effect on two consecutive slides", () => {
    for (let index = 0; index < TRANSITION_EFFECTS.length * 2; index++) {
      expect(autoTransitionEffect(index)).not.toBe(autoTransitionEffect(index + 1));
    }
  });
});

describe("transitionDurationMs", () => {
  it("sets the transition to 30% of the slide duration", () => {
    expect(transitionDurationMs(2000)).toBe(600);
  });

  it("rounds the transition duration to a whole millisecond", () => {
    expect(transitionDurationMs(2001)).toBe(600);
  });

  it("caps the transition duration at 1000 ms on a long slide", () => {
    expect(transitionDurationMs(10_000)).toBe(1000);
  });
});
