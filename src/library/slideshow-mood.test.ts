import { describe, expect, it } from "vitest";
import { checkSlideshowMood, InvalidSlideshowMoodError, SLIDESHOW_MOODS } from "./slideshow-mood";

describe("checkSlideshowMood", () => {
  it.each(SLIDESHOW_MOODS)("accepts %s", (mood) => {
    expect(checkSlideshowMood(mood, "slideshow s1")).toBe(mood);
  });

  it.each([["custom"], ["sleepy"], [""], [3], [null]])(
    "refuses %j, naming the field, the value and the choices",
    (value) => {
      expect(() => checkSlideshowMood(value, "slideshow s1")).toThrow(InvalidSlideshowMoodError);
      expect(() => checkSlideshowMood(value, "slideshow s1")).toThrow(
        `slideshow s1 mood: expected one of ${SLIDESHOW_MOODS.join(", ")}, got ${JSON.stringify(value)}`,
      );
    },
  );
});
