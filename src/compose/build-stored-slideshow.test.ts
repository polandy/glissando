import { describe, expect, it } from "vitest";
import { buildStoredSlideshow } from "./build-stored-slideshow";
import type { StoredPicture } from "../library/stored-slideshow";

function picture(id: string, capturedAt: string): StoredPicture {
  return { id, capturedAt, fileName: `${id}.jpg`, width: 100, height: 100 };
}

describe("buildStoredSlideshow", () => {
  it("orders the pictures by capture date", () => {
    const second = picture("b", "2025-07-20T10:00:00Z");
    const first = picture("a", "2025-07-01T10:00:00Z");

    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [second, first],
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
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.title).toBe("July – August 2025");
  });

  it("omits music when none was given", () => {
    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z")],
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.music).toBeUndefined();
    expect("music" in slideshow).toBe(false);
  });

  it("carries the given music through", () => {
    const music = { id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" };

    const slideshow = buildStoredSlideshow({
      id: "s1",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z")],
      music,
      secondsPerPicture: 5,
      locale: "en",
    });

    expect(slideshow.music).toEqual(music);
  });
});
