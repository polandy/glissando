import { describe, expect, it } from "vitest";
import { GRADED_SLIDESHOW_LOOKS } from "../player/looks/slideshow-look";
import { checkSlideshowLook, InvalidSlideshowLookError } from "./slideshow-look";

describe("checkSlideshowLook", () => {
  it.each(GRADED_SLIDESHOW_LOOKS)("accepts %s", (look) => {
    expect(checkSlideshowLook(look, "slideshow s1")).toBe(look);
  });

  it.each([["none"], ["sepia"], [""], [3], [null]])("refuses %j, naming the field", (value) => {
    expect(() => checkSlideshowLook(value, "slideshow s1")).toThrow(InvalidSlideshowLookError);
    expect(() => checkSlideshowLook(value, "slideshow s1")).toThrow("slideshow s1 look");
  });
});
