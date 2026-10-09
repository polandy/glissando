import { describe, expect, it } from "vitest";
import {
  movePicture,
  setPictureCaption,
  setPictureDuration,
  setPictureTransition,
  setSlideshowTransition,
} from "./slideshow-edits";
import { InvalidOwnTimingError } from "./own-timing";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

function picture(id: string): StoredPicture {
  return { id, capturedAt: "2025-07-01T10:00:00Z", width: 100, height: 100, fileName: `${id}.jpg` };
}

function slideshow(ids: readonly string[]): StoredSlideshow {
  return {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ids.map(picture),
    secondsPerPicture: 5,
  };
}

describe("setPictureDuration", () => {
  it("gives the picture its own duration and leaves the others automatic", () => {
    const edited = setPictureDuration(slideshow(["a", "b"]), "b", 8000);

    expect(edited.pictures[1]?.durationMs).toBe(8000);
    expect(edited.pictures[0]).toEqual(picture("a"));
  });

  it("without a duration makes the picture automatic again: the field is gone", () => {
    const own = setPictureDuration(slideshow(["a"]), "a", 8000);

    const automatic = setPictureDuration(own, "a", undefined);

    expect(automatic.pictures[0]?.id).toBe("a");
    expect(automatic.pictures[0]).not.toHaveProperty("durationMs");
  });

  it("refuses a duration off the half-second grid, so no invalid record is stored", () => {
    expect(() => setPictureDuration(slideshow(["a"]), "a", 8200)).toThrow(InvalidOwnTimingError);
    expect(() => setPictureDuration(slideshow(["a"]), "a", 8200)).toThrow('picture "a" durationMs');
  });

  it("keeps the own duration with its picture when the picture moves", () => {
    const own = setPictureDuration(slideshow(["a", "b", "c"]), "a", 8000);

    expect(movePicture(own, "a", 2).pictures[2]?.durationMs).toBe(8000);
  });

  it("keeps the picture's caption", () => {
    const captioned = setPictureCaption(slideshow(["a"]), "a", "Jetty");

    expect(setPictureDuration(captioned, "a", 8000).pictures[0]?.caption).toBe("Jetty");
  });
});

describe("setPictureTransition", () => {
  it("gives the picture its own transition and leaves the others automatic", () => {
    const edited = setPictureTransition(slideshow(["a", "b"]), "a", "cut");

    expect(edited.pictures[0]?.transition).toBe("cut");
    expect(edited.pictures[1]).toEqual(picture("b"));
  });

  it("without a transition makes the picture automatic again: the field is gone", () => {
    const own = setPictureTransition(slideshow(["a"]), "a", "dissolve");

    const automatic = setPictureTransition(own, "a", undefined);

    expect(automatic.pictures[0]?.id).toBe("a");
    expect(automatic.pictures[0]).not.toHaveProperty("transition");
  });

  it("refuses an unknown effect, so no invalid record is stored", () => {
    const unknownEffect = "fade" as "cut";

    expect(() => setPictureTransition(slideshow(["a"]), "a", unknownEffect)).toThrow(
      'picture "a" transition',
    );
  });

  it("keeps the own transition with its picture when the picture moves", () => {
    const own = setPictureTransition(slideshow(["a", "b", "c"]), "a", "circle-open");

    expect(movePicture(own, "a", 1).pictures[1]?.transition).toBe("circle-open");
  });
});

describe("setSlideshowTransition", () => {
  it("gives the slideshow its default transition and leaves the pictures' own ones alone", () => {
    const own = setPictureTransition(slideshow(["a", "b"]), "a", "cut");

    const edited = setSlideshowTransition(own, "alternate");

    expect(edited.transition).toBe("alternate");
    expect(edited.pictures).toEqual(own.pictures);
  });

  it.each([["crossfade" as const], [undefined]])(
    "with %s returns to the default crossfade: the field is gone",
    (transition) => {
      const own = setSlideshowTransition(slideshow(["a"]), "dissolve");

      const reset = setSlideshowTransition(own, transition);

      expect(reset.id).toBe("show");
      expect(reset).not.toHaveProperty("transition");
    },
  );

  it("refuses an unknown effect, so no invalid record is stored", () => {
    const unknownEffect = "fade" as "cut";

    expect(() => setSlideshowTransition(slideshow(["a"]), unknownEffect)).toThrow(
      'slideshow "show" transition',
    );
  });
});
