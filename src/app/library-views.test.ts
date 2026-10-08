import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { slideshowDetails, slideshowSummary } from "./library-views";

const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    { id: "p1", capturedAt: "2025-07-01T10:00:00Z", width: 300, height: 200, fileName: "a.jpg" },
    { id: "p2", capturedAt: "2025-07-02T10:00:00Z", width: 300, height: 200, fileName: "b.jpg" },
  ],
  secondsPerPicture: 4,
};
const withMusic: StoredSlideshow = {
  ...stored,
  music: { id: "m", fileName: "Sommer.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
};
const urlOf = (id: string) => `url:${id}`;

describe("slideshowSummary", () => {
  it("summarises a slideshow for its start card, covered by its first pictures", () => {
    expect(slideshowSummary(withMusic, urlOf)).toEqual({
      id: "show",
      title: "Juli 2025",
      coverUrls: ["url:p1", "url:p2"],
      pictureCount: 2,
      durationSeconds: 30,
      hasMusic: true,
    });
  });

  it("covers a start card with at most three pictures", () => {
    const morePictures: StoredSlideshow = {
      ...stored,
      pictures: ["p1", "p2", "p3", "p4"].map((id) => ({
        id,
        capturedAt: "2025-07-01T10:00:00Z",
        width: 300,
        height: 200,
        fileName: `${id}.jpg`,
      })),
    };

    expect(slideshowSummary(morePictures, urlOf).coverUrls).toEqual(["url:p1", "url:p2", "url:p3"]);
  });
});

describe("slideshowDetails", () => {
  it("lists the pictures in play order with their thumbnails", () => {
    expect(slideshowDetails(stored, urlOf)).toEqual({
      title: "Juli 2025",
      coverUrl: "url:p1",
      durationSeconds: 8,
      musicTitle: null,
      musicSeconds: null,
      ownOrder: false,
      ownMotionCount: 0,
      ownDurationCount: 0,
      ownTransitionCount: 0,
      captionCount: 0,
      capturedFrom: "2025-07-01T10:00:00Z",
      capturedTo: "2025-07-02T10:00:00Z",
      pictures: [
        {
          id: "p1",
          thumbnailUrl: "url:p1",
          capturedAt: "2025-07-01T10:00:00Z",
          ownMotion: false,
          ownDurationMs: null,
          ownTransition: null,
        },
        {
          id: "p2",
          thumbnailUrl: "url:p2",
          capturedAt: "2025-07-02T10:00:00Z",
          ownMotion: false,
          ownDurationMs: null,
          ownTransition: null,
        },
      ],
    });
  });

  it("marks the pictures with an own motion and counts them", () => {
    const motion = {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 2, centerX: 0.5, centerY: 0.5 },
    };
    const [first, second] = stored.pictures;
    const edited = { ...stored, pictures: [first, { ...second, kenBurns: motion }] };

    const details = slideshowDetails(edited as StoredSlideshow, urlOf);

    expect(details.pictures.map((picture) => picture.ownMotion)).toEqual([false, true]);
    expect(details.ownMotionCount).toBe(1);
  });

  it("counts the pictures with a caption", () => {
    const [first, second] = stored.pictures;
    const edited = { ...stored, pictures: [first, { ...second, caption: "Am Steg" }] };

    expect(slideshowDetails(edited as StoredSlideshow, urlOf).captionCount).toBe(1);
  });

  it("names the music by its file name", () => {
    expect(slideshowDetails(withMusic, urlOf).musicTitle).toBe("Sommer.mp3");
  });

  it("tells an order of the user's own, and covers it first with its first picture", () => {
    const reordered: StoredSlideshow = {
      ...stored,
      pictures: [...stored.pictures].reverse(),
      ownOrder: true,
    };

    const details = slideshowDetails(reordered, urlOf);

    expect(details.ownOrder).toBe(true);
    expect(details.coverUrl).toBe("url:p2");
  });

  it("spans the earliest to the latest capture date, whatever the order", () => {
    const reordered: StoredSlideshow = { ...stored, pictures: [...stored.pictures].reverse() };

    const details = slideshowDetails(reordered, urlOf);

    expect([details.capturedFrom, details.capturedTo]).toEqual([
      "2025-07-01T10:00:00Z",
      "2025-07-02T10:00:00Z",
    ]);
  });

  it("marks own durations and own transitions, a last picture's transition not counting", () => {
    const timed: StoredSlideshow = {
      ...withMusic,
      pictures: [
        { ...(stored.pictures[0] as StoredPicture), durationMs: 8000, transition: "cut" },
        { ...(stored.pictures[1] as StoredPicture), transition: "dissolve" },
      ],
    };

    const details = slideshowDetails(timed, urlOf);

    expect(details.pictures.map((picture) => picture.ownDurationMs)).toEqual([8000, null]);
    expect(details.pictures.map((picture) => picture.ownTransition)).toEqual(["cut", null]);
    expect([details.ownDurationCount, details.ownTransitionCount]).toEqual([1, 1]);
    expect(details.durationSeconds).toBe(30);
    expect(details.musicSeconds).toBe(30);
  });

  it("spreads the music over the pictures that are left", () => {
    const fewer: StoredSlideshow = { ...withMusic, pictures: stored.pictures.slice(0, 1) };

    expect(slideshowDetails(fewer, urlOf).durationSeconds).toBe(30);
    expect(slideshowDetails(fewer, urlOf).pictures).toHaveLength(1);
  });
});
