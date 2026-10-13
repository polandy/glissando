import { describe, expect, it } from "vitest";
import { composeRound, type RoundPicture } from "./round-composition";

function picture(id: string, takenAt: string, size: RoundPicture["size"] = null): RoundPicture {
  return { id, takenAt, size };
}

describe("composeRound", () => {
  it("composes one slide per picture id, in the given order", () => {
    const picturesById = new Map([
      ["a", picture("a", "2024-01-01T00:00:00Z")],
      ["b", picture("b", "2024-01-02T00:00:00Z")],
    ]);

    const slideshow = composeRound("Summer", ["b", "a"], picturesById, 30_000, (id) => `/pic/${id}`);

    expect(slideshow.slides.map((slide) => slide.image.src)).toEqual(["/pic/b", "/pic/a"]);
    expect(slideshow.slides.map((slide) => slide.image.capturedAt)).toEqual([
      "2024-01-02T00:00:00Z",
      "2024-01-01T00:00:00Z",
    ]);
    expect(slideshow.title).toBe("Summer");
    expect(slideshow.music).toBeUndefined();
  });

  it("gives every slide the chosen seconds per picture", () => {
    const picturesById = new Map([["a", picture("a", "2024-01-01T00:00:00Z")]]);

    const slideshow = composeRound("Summer", ["a"], picturesById, 10_000, (id) => id);

    expect(slideshow.slides[0]?.durationMs).toBe(10_000);
  });

  it("carries no transition out of the last slide", () => {
    const picturesById = new Map([
      ["a", picture("a", "2024-01-01T00:00:00Z")],
      ["b", picture("b", "2024-01-02T00:00:00Z")],
    ]);

    const slideshow = composeRound("Summer", ["a", "b"], picturesById, 30_000, (id) => id);

    expect(slideshow.slides[0]?.transitionToNext).toBeDefined();
    expect(slideshow.slides[1]?.transitionToNext).toBeUndefined();
  });

  it("bakes no caption into the slide: the frame draws the album name and date itself", () => {
    const picturesById = new Map([["a", picture("a", "2024-01-01T00:00:00Z")]]);

    const slideshow = composeRound("Summer", ["a"], picturesById, 30_000, (id) => id);

    expect(slideshow.slides[0]?.caption).toBeUndefined();
  });

  it("fails loud for a picture id the album's own list does not know", () => {
    expect(() => composeRound("Summer", ["missing"], new Map(), 30_000, (id) => id)).toThrow(
      /missing/,
    );
  });
});
