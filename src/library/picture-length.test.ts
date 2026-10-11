import { describe, expect, it } from "vitest";
import {
  checkPictureLength,
  InvalidPictureLengthError,
  OWN_SECONDS_PICTURE_LENGTH,
} from "./picture-length";

describe("checkPictureLength", () => {
  it("accepts the pictures lasting their own seconds", () => {
    expect(checkPictureLength(OWN_SECONDS_PICTURE_LENGTH, "slideshow")).toBe("seconds");
  });

  it("rejects anything else, naming where it came from", () => {
    expect(() => checkPictureLength("fill", 'slideshow "a"')).toThrow(InvalidPictureLengthError);
    expect(() => checkPictureLength("fill", 'slideshow "a"')).toThrow(/slideshow "a"/);
  });
});
