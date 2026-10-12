import { describe, expect, it } from "vitest";
import {
  checkPortraitPictures,
  FILL_SCREEN_PORTRAIT_PICTURES,
  InvalidPortraitPicturesError,
  ONE_AT_A_TIME_PORTRAIT_PICTURES,
} from "./portrait-pictures";

describe("checkPortraitPictures", () => {
  it("accepts one-at-a-time", () => {
    expect(checkPortraitPictures(ONE_AT_A_TIME_PORTRAIT_PICTURES, "slideshow")).toBe(
      "one-at-a-time",
    );
  });

  it("accepts fill-screen", () => {
    expect(checkPortraitPictures(FILL_SCREEN_PORTRAIT_PICTURES, "slideshow")).toBe("fill-screen");
  });

  it("rejects anything else, naming where it came from", () => {
    expect(() => checkPortraitPictures("cropped", 'slideshow "a"')).toThrow(
      InvalidPortraitPicturesError,
    );
    expect(() => checkPortraitPictures("cropped", 'slideshow "a"')).toThrow(/slideshow "a"/);
  });
});
