import { describe, expect, it } from "vitest";
import type { SlideshowChapter } from "../../../../compose/chapters-of-slideshow";
import type { PictureTile } from "../../view-models";
import { chapterPreviewFace } from "./chapter-preview-model";

const CHAPTER: SlideshowChapter = {
  kind: "automatic",
  anchorPictureId: "b",
  title: "Lissabon",
  subtitle: "Tag 11–12 · 22.–23. Juni",
  automaticTitle: "Lissabon",
  automaticSubtitle: "Tag 11–12 · 22.–23. Juni",
  titleEdited: false,
  subtitleEdited: false,
  hidden: false,
};

const TILE: PictureTile = {
  id: "b",
  thumbnailUrl: "blob:b",
  capturedAt: "2025-06-22T10:00:00.000Z",
  ownMotion: false,
  ownDurationMs: null,
  ownTransition: null,
  pairedWithNumber: null,
  blurredFill: false,
  alone: false,
  colours: { veil: "#113355", accent: "#AACCEE" },
};
const PICTURES = [TILE];

describe("chapterPreviewFace", () => {
  it("builds the card from the chapter's own title and subtitle", () => {
    const { card } = chapterPreviewFace(CHAPTER, PICTURES);

    expect(card.title).toBe(CHAPTER.title);
    expect(card.subtitle).toBe(CHAPTER.subtitle);
  });

  it("veils the anchor picture's own veil colour", () => {
    const { card, pictureUrl } = chapterPreviewFace(CHAPTER, PICTURES);

    expect(card.veil).toEqual({ amount: 0.6, tint: TILE.colours.veil });
    expect(pictureUrl).toBe(TILE.thumbnailUrl);
  });

  it("picks dark ink for a light veil, light ink for a dark one", () => {
    const { card: onDark } = chapterPreviewFace(CHAPTER, PICTURES);
    expect(onDark.ink).toBe("light");

    const lightVeil = { ...TILE, colours: { veil: "#F0F0F0", accent: "#333333" } };
    const { card: onLight } = chapterPreviewFace(CHAPTER, [lightVeil]);
    expect(onLight.ink).toBe("dark");
  });

  it("refuses a chapter whose anchor picture is not among the previewed pictures", () => {
    expect(() => chapterPreviewFace(CHAPTER, [])).toThrow(/not one of the strip's/);
  });
});
