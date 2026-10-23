import { describe, expect, it } from "vitest";
import { setSlideshowLook } from "./slideshow-edits";
import { InvalidSlideshowLookError } from "./slideshow-look";
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

describe("setSlideshowLook", () => {
  it("sets the slideshow's colour grade", () => {
    const edited = setSlideshowLook(slideshow(["a"]), "warm");

    expect(edited.look).toBe("warm");
  });

  it("with undefined removes the field: None again", () => {
    const graded = setSlideshowLook(slideshow(["a"]), "warm");

    const none = setSlideshowLook(graded, undefined);

    expect(none).not.toHaveProperty("look");
  });

  it("with None removes the field too, since None is never itself stored", () => {
    const graded = setSlideshowLook(slideshow(["a"]), "warm");

    const none = setSlideshowLook(graded, "none");

    expect(none).not.toHaveProperty("look");
  });

  it("rejects a value that is no look", () => {
    expect(() => setSlideshowLook(slideshow(["a"]), "sepia" as never)).toThrow(
      InvalidSlideshowLookError,
    );
  });
});
