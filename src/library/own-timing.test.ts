import { describe, expect, it } from "vitest";
import {
  CUT_TRANSITION,
  InvalidOwnTimingError,
  TRANSITION_CHOICES,
  checkOwnDurationMs,
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
