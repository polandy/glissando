import { describe, expect, it } from "vitest";
import { InvalidPictureLengthError, OWN_SECONDS_PICTURE_LENGTH } from "./picture-length";
import { setPictureLength, setSecondsPerPicture } from "./slideshow-edits-timing";
import type { StoredSlideshow } from "./stored-slideshow";

const SLIDESHOW: StoredSlideshow = {
  id: "show",
  title: "July 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    { id: "a", capturedAt: "2025-07-01T10:00:00Z", width: 1, height: 1, fileName: "a.jpg" },
  ],
  music: { id: "m1", fileName: "generated.mp3", durationMs: 204_000, mimeType: "audio/mpeg" },
  secondsPerPicture: 5,
};

describe("setPictureLength", () => {
  it("lets the pictures last their own seconds with music", () => {
    expect(setPictureLength(SLIDESHOW, OWN_SECONDS_PICTURE_LENGTH)).toEqual({
      ...SLIDESHOW,
      pictureLength: "seconds",
    });
  });

  it("deletes the field when the pictures fill the music again", () => {
    const ownSeconds = setPictureLength(SLIDESHOW, OWN_SECONDS_PICTURE_LENGTH);

    expect(setPictureLength(ownSeconds, undefined)).toEqual(SLIDESHOW);
    expect(setPictureLength(ownSeconds, undefined)).not.toHaveProperty("pictureLength");
  });

  it("refuses a value that is no picture length", () => {
    expect(() => setPictureLength(SLIDESHOW, "fill" as never)).toThrow(InvalidPictureLengthError);
  });
});

describe("setSecondsPerPicture", () => {
  it("sets how long each picture without an own duration stays", () => {
    expect(setSecondsPerPicture(SLIDESHOW, 6.5)).toEqual({ ...SLIDESHOW, secondsPerPicture: 6.5 });
  });

  it.each([1.5, 15.5, 4.25, Number.NaN])(
    "refuses %s, off the half-second steps from 2 to 15 s",
    (seconds) => {
      expect(() => setSecondsPerPicture(SLIDESHOW, seconds)).toThrow(RangeError);
    },
  );
});
