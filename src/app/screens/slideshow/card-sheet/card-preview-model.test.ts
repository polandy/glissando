import { describe, expect, it } from "vitest";
import type { StoredCard } from "../../../../library/stored-slideshow";
import { CARD_SWATCHES } from "../../../../player/card-palette";
import { CARD_PREVIEW_HOLD_MS, previewFace, styleAttr, withDrift } from "./card-preview-model";

const PICTURE_CARD: StoredCard = {
  title: "Juli 2025",
  subtitle: "1.–14. Juli",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "picture", pictureId: "a", fade: 60 },
  motion: true,
};

describe("previewFace", () => {
  it("veils a picture background with the fixed plum tint, at the stored fade", () => {
    const { card, pictureId, ground } = previewFace(PICTURE_CARD);

    expect(pictureId).toBe("a");
    expect(ground).toBeUndefined();
    expect(card.veil).toEqual({ amount: 0.6, tint: CARD_SWATCHES.plum });
  });

  it("reveals at the preview's fixed hold once motion is on", () => {
    const { card } = previewFace(PICTURE_CARD);

    expect(card.revealAtMs).toBe(CARD_PREVIEW_HOLD_MS);
  });

  it("never reveals a still card", () => {
    const { card } = previewFace({ ...PICTURE_CARD, motion: false });

    expect(card.revealAtMs).toBeUndefined();
  });

  it("draws a colour background as its own swatch, with no veil", () => {
    const { card, ground, pictureId } = previewFace({
      ...PICTURE_CARD,
      background: { kind: "colour", colour: "mint" },
    });

    expect(ground).toBe(CARD_SWATCHES.mint);
    expect(pictureId).toBeUndefined();
    expect(card.veil).toBeUndefined();
  });

  it("drops an absent subtitle rather than storing it as undefined", () => {
    const { card } = previewFace({ ...PICTURE_CARD, subtitle: undefined });

    expect("subtitle" in card).toBe(false);
  });
});

describe("styleAttr", () => {
  it("turns camelCase declarations into a kebab-case style string", () => {
    expect(styleAttr({ fontFamily: "serif", fontSize: "12px" })).toBe(
      "font-family: serif; font-size: 12px",
    );
  });
});

describe("withDrift", () => {
  it("appends the drift as a translateY, after the declaration's own transform", () => {
    const next = withDrift({ transform: "translateX(-50%)" }, 0.4);

    expect(next.transform).toBe("translateX(-50%) translateY(0.4em)");
  });
});
