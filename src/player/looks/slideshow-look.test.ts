import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLIDESHOW_LOOK,
  GRADED_SLIDESHOW_LOOKS,
  isGradedLook,
  SLIDESHOW_LOOKS,
} from "./slideshow-look";

describe("SLIDESHOW_LOOKS", () => {
  it("lists every look, none first, in the sheet's order", () => {
    expect(SLIDESHOW_LOOKS).toEqual([
      "none",
      "warm",
      "cool",
      "vivid",
      "film",
      "black-and-white",
      "faded",
    ]);
  });

  it("defaults to none", () => {
    expect(DEFAULT_SLIDESHOW_LOOK).toBe("none");
  });

  it("GRADED_SLIDESHOW_LOOKS is every look but none, same order", () => {
    expect(GRADED_SLIDESHOW_LOOKS).toEqual([
      "warm",
      "cool",
      "vivid",
      "film",
      "black-and-white",
      "faded",
    ]);
  });
});

describe("isGradedLook", () => {
  it("is false for none", () => {
    expect(isGradedLook("none")).toBe(false);
  });

  it.each(GRADED_SLIDESHOW_LOOKS)("is true for %s", (look) => {
    expect(isGradedLook(look)).toBe(true);
  });
});
