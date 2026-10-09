import { describe, expect, it } from "vitest";
import {
  ALTERNATE_TRANSITION,
  CUT_TRANSITION,
  InvalidOwnTimingError,
  SLIDESHOW_TRANSITIONS,
  TRANSITION_CHOICES,
  checkOwnDurationMs,
  checkSlideshowTransition,
  checkTransitionChoice,
} from "./own-timing";
import { TRANSITION_EFFECTS } from "../player/slideshow";

describe("checkOwnDurationMs", () => {
  it.each([2000, 2500, 5000, 14_500, 15_000])(
    "accepts %i ms: within 2 to 15 s, on the half second",
    (ms) => {
      expect(checkOwnDurationMs(ms, "picture p1")).toBe(ms);
    },
  );

  it.each([
    ["shorter than 2 s", 1500],
    ["longer than 15 s", 15_500],
    ["off the half-second grid", 5250],
    ["no whole millisecond", 5000.5],
    ["no number", "5000"],
    ["not a number", Number.NaN],
  ])("refuses a duration %s, naming the field", (_, value) => {
    expect(() => checkOwnDurationMs(value, "picture p1")).toThrow(InvalidOwnTimingError);
    expect(() => checkOwnDurationMs(value, "picture p1")).toThrow("picture p1 durationMs");
  });
});

describe("checkTransitionChoice", () => {
  it("offers the player's six effects plus the cut", () => {
    expect(TRANSITION_CHOICES).toEqual([...TRANSITION_EFFECTS, CUT_TRANSITION]);
  });

  it.each(TRANSITION_CHOICES)("accepts %s", (choice) => {
    expect(checkTransitionChoice(choice, "picture p1")).toBe(choice);
  });

  it.each([["fade"], [""], [3], [null]])("refuses %j, naming the field", (value) => {
    expect(() => checkTransitionChoice(value, "picture p1")).toThrow(InvalidOwnTimingError);
    expect(() => checkTransitionChoice(value, "picture p1")).toThrow("picture p1 transition");
  });
});

describe("checkSlideshowTransition", () => {
  it("offers a picture's choices plus alternating", () => {
    expect(SLIDESHOW_TRANSITIONS).toEqual([...TRANSITION_CHOICES, ALTERNATE_TRANSITION]);
  });

  it.each(SLIDESHOW_TRANSITIONS)("accepts %s", (choice) => {
    expect(checkSlideshowTransition(choice, "slideshow s1")).toBe(choice);
  });

  it.each([["fade"], [""], [3], [null]])("refuses %j, naming the field", (value) => {
    expect(() => checkSlideshowTransition(value, "slideshow s1")).toThrow(InvalidOwnTimingError);
    expect(() => checkSlideshowTransition(value, "slideshow s1")).toThrow(
      "slideshow s1 transition",
    );
  });
});
