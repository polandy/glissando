import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../library/stored-slideshow";
import { DEFAULT_SLIDESHOW_TRANSITION } from "../library/own-timing";
import { CHAPTER_SLIDE_MS } from "./compose-chapters";
import { insertedTimeFor, realOffsetsMs } from "./inserted-time";
import type { SlideUnit } from "./slide-units";

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 300,
    height: 400,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

const PICTURES = ["a", "b", "c"].map(picture);
const SINGLE_THEN_PAIR: readonly SlideUnit[] = [
  { pictureIndices: [0] },
  { pictureIndices: [1, 2] },
];

function chapterAt(anchorPictureId: string) {
  return { anchorPictureId, title: "Lisbon", subtitle: "" };
}

describe("insertedTimeFor", () => {
  it("widens a single slide's own time by a chapter anchored on it", () => {
    const inserted = insertedTimeFor(
      undefined,
      [chapterAt("a")],
      PICTURES,
      SINGLE_THEN_PAIR,
      undefined,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(inserted).toEqual({ beforeMs: [0, 0], ownMs: [CHAPTER_SLIDE_MS, 0] });
  });

  it("places a dedicated chapter slide before a portrait pair, which never carries a card", () => {
    const inserted = insertedTimeFor(
      undefined,
      [chapterAt("c")],
      PICTURES,
      SINGLE_THEN_PAIR,
      undefined,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(inserted).toEqual({ beforeMs: [0, CHAPTER_SLIDE_MS], ownMs: [0, 0] });
  });
});

describe("realOffsetsMs", () => {
  it("shifts each slide by everything inserted before it and widens its end by its own", () => {
    const offsets = realOffsetsMs({ beforeMs: [100, 0, 30], ownMs: [0, 20, 0] }, 3);

    expect(offsets).toEqual({ startMs: [100, 100, 150], endMs: [100, 120, 150] });
  });

  it("adds nothing without inserted time", () => {
    expect(realOffsetsMs(undefined, 2)).toEqual({ startMs: [0, 0], endMs: [0, 0] });
  });
});
