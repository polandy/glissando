import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { slideshowDetails } from "./library-views";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };
const still = (id: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  width: 300,
  height: 200,
  fileName: `${id}.jpg`,
  colours: COLOURS,
});

describe("slideshowDetails video slides", () => {
  it("gives a video's tile the length of its excerpt and a still none", () => {
    const clip = { mediaId: "v1", sourceMs: 60_000, startMs: 10_000, endMs: 22_500 };
    const withClip: StoredSlideshow = {
      id: "show",
      title: "Juli 2025",
      createdAt: "2026-10-08T12:00:00Z",
      songs: [],
      secondsPerPicture: 4,
      pictures: [{ ...still("p1"), video: clip }, still("p2")],
    };

    const details = slideshowDetails(withClip, (id: string) => `url:${id}`);

    expect(details.pictures.map((picture) => picture.clipMs)).toEqual([12_500, undefined]);
  });
});
