import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { slideshowDetails } from "./library-views";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };
const picture: StoredPicture = {
  id: "p1",
  capturedAt: "2025-07-01T10:00:00Z",
  width: 300,
  height: 200,
  fileName: "a.jpg",
  colours: COLOURS,
};
const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [picture],
  songs: [],
  secondsPerPicture: 4,
};
const urlOf = (id: string) => `url:${id}`;

describe("slideshowDetails mood", () => {
  it("leaves mood out of the details while the slideshow is Custom", () => {
    expect(slideshowDetails(stored, urlOf, "en").mood).toBeUndefined();
  });

  it("carries the slideshow's mood into the details", () => {
    const calm: StoredSlideshow = { ...stored, mood: "calm" };

    expect(slideshowDetails(calm, urlOf, "en").mood).toBe("calm");
  });
});
