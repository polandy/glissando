import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { slideshowDetails } from "./library-views";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };
const picture = (id: string, overrides: Partial<StoredPicture> = {}): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  width: 300,
  height: 200,
  fileName: `${id}.jpg`,
  colours: COLOURS,
  ...overrides,
});
const stored = (pictures: readonly StoredPicture[]): StoredSlideshow => ({
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: pictures as StoredSlideshow["pictures"],
  songs: [],
  secondsPerPicture: 4,
});
const urlOf = (id: string) => `url:${id}`;

describe("slideshowDetails captions", () => {
  it("counts the pictures with a caption", () => {
    const edited = stored([picture("p1"), picture("p2", { caption: "Am Steg" })]);

    expect(slideshowDetails(edited, urlOf).captionCount).toBe(1);
  });

  it("carries a picture's caption on its tile, and no caption key at all without one", () => {
    const withCaption = stored([
      picture("p1", { caption: "Last light" }),
      picture("p2", { capturedAt: "2025-07-02T10:00:00Z" }),
    ]);

    const [first, second] = slideshowDetails(withCaption, urlOf).pictures;

    expect(first?.caption).toBe("Last light");
    expect("caption" in (second ?? {})).toBe(false);
  });
});
