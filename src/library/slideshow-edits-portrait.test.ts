import { describe, expect, it } from "vitest";
import { setPictureAlone, setPortraitPictures } from "./slideshow-edits";
import { FILL_SCREEN_PORTRAIT_PICTURES, InvalidPortraitPicturesError } from "./portrait-pictures";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function slideshow(ids: readonly string[], overrides: Partial<StoredSlideshow> = {}) {
  const base: StoredSlideshow = {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ids.map(picture),
    songs: [],
    secondsPerPicture: 5,
  };
  return { ...base, ...overrides };
}

describe("setPortraitPictures", () => {
  it("sets the slideshow's layout", () => {
    const edited = setPortraitPictures(slideshow(["a"]), FILL_SCREEN_PORTRAIT_PICTURES);

    expect(edited.portraitPictures).toBe("fill-screen");
  });

  it("with undefined removes the field: automatic again", () => {
    const chosen = setPortraitPictures(slideshow(["a"]), FILL_SCREEN_PORTRAIT_PICTURES);

    const automatic = setPortraitPictures(chosen, undefined);

    expect(automatic).not.toHaveProperty("portraitPictures");
  });

  it("rejects a value that is no choice", () => {
    expect(() => setPortraitPictures(slideshow(["a"]), "cropped" as never)).toThrow(
      InvalidPortraitPicturesError,
    );
  });
});

describe("setPictureAlone", () => {
  it("marks the picture never to be composed into a pair", () => {
    const edited = setPictureAlone(slideshow(["a", "b"]), "b", true);

    expect(edited.pictures[1]?.alone).toBe(true);
    expect(edited.pictures[0]).toEqual(picture("a"));
  });

  it("with false removes the field: it may be paired again", () => {
    const alone = setPictureAlone(slideshow(["a"]), "a", true);

    const pairable = setPictureAlone(alone, "a", false);

    expect(pairable.pictures[0]).not.toHaveProperty("alone");
  });
});
