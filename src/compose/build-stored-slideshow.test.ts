import { describe, expect, it } from "vitest";
import { buildStoredSlideshow } from "./build-stored-slideshow";
import type { StoredPicture } from "../library/stored-slideshow";

function picture(id: string, capturedAt: string): StoredPicture {
  return {
    id,
    capturedAt,
    fileName: `${id}.jpg`,
    width: 100,
    height: 100,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

describe("buildStoredSlideshow", () => {
  it("orders the pictures by capture date", () => {
    const second = picture("b", "2025-07-20T10:00:00Z");
    const first = picture("a", "2025-07-01T10:00:00Z");

    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [second, first],
      songs: [],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.pictures).toEqual([first, second]);
  });

  it("titles the slideshow from the pictures' capture range", () => {
    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-08-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-08-20T10:00:00Z")],
      songs: [],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.title).toBe("July – August 2025");
  });

  it("has an empty playlist when no music was given", () => {
    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z")],
      songs: [],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.songs).toEqual([]);
  });

  it("uses the explicit order instead of capture order when one is given", () => {
    const second = picture("b", "2025-07-20T10:00:00Z");
    const first = picture("a", "2025-07-01T10:00:00Z");

    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [first, second],
      order: ["b", "a"],
      songs: [],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.pictures).toEqual([second, first]);
    expect(slideshow.ownOrder).toBeUndefined();
  });

  it("throws loudly when the order names a picture it does not have", () => {
    const build = () =>
      buildStoredSlideshow({
        id: "s1",
        createdAt: "2025-07-21T00:00:00Z",
        pictures: [picture("a", "2025-07-01T10:00:00Z")],
        order: ["ghost"],
        songs: [],
        secondsPerPicture: 5,
        locale: "en",
      });

    expect(build).toThrow(/ghost/);
  });

  it("throws loudly when the order leaves a picture out", () => {
    const build = () =>
      buildStoredSlideshow({
        id: "s1",
        createdAt: "2025-07-21T00:00:00Z",
        pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
        order: ["a"],
        songs: [],
        secondsPerPicture: 5,
        locale: "en",
      });

    expect(build).toThrow();
  });

  it("flags the explicit order as the user's own when asked to", () => {
    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z")],
      order: ["a"],
      ownOrder: true,
      songs: [],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.ownOrder).toBe(true);
  });

  it("ignores ownOrder without an explicit order", () => {
    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z")],
      songs: [],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.ownOrder).toBeUndefined();
  });

  it("carries the given songs through", () => {
    const music = { id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" };

    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z")],
      songs: [music],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.songs).toEqual([music]);
  });
});
