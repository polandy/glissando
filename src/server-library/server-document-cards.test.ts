import { describe, expect, it } from "vitest";
import type { StoredCard, StoredSlideshow } from "../library/stored-slideshow";
import { readServerDocument, serverDocumentFor, storedSlideshowFrom } from "./server-document";
import {
  ASSET_A,
  ASSET_B,
  readFails,
  slideshow as baseSlideshow,
} from "./server-document-fixtures";

const OPENING: StoredCard = {
  title: "Herbst in Wien",
  style: "modern",
  position: "centre",
  background: { kind: "picture", pictureId: ASSET_B, fade: 60 },
  motion: true,
};
const CLOSING: StoredCard = {
  title: "",
  style: "modern",
  position: "centre",
  background: { kind: "colour", colour: "night" },
  motion: false,
};

const withCards: StoredSlideshow = { ...baseSlideshow, openingCard: OPENING, closingCard: CLOSING };

describe("openingCard and closingCard in the server document (ADR-0032)", () => {
  it("writes the card's picture by its position among the document's pictures", () => {
    const written = serverDocumentFor(withCards);
    expect(written.slideshow.openingCard).toEqual({
      title: "Herbst in Wien",
      style: "modern",
      position: "centre",
      background: { kind: "picture", pictureIndex: 1, fade: 60 },
      motion: true,
    });
    expect(written.slideshow.closingCard).toEqual(CLOSING);
  });

  it("is absent while the slideshow has neither card", () => {
    const written = serverDocumentFor(baseSlideshow);
    expect(written.slideshow).not.toHaveProperty("openingCard");
    expect(written.slideshow).not.toHaveProperty("closingCard");
  });

  it("round-trips through writing, reading and storing back, resolving the index to the asset id", () => {
    const written = serverDocumentFor(withCards);
    const read = readServerDocument(JSON.parse(JSON.stringify(written)));
    const stored = storedSlideshowFrom("device-id", read);
    expect(stored.openingCard).toEqual(OPENING);
    expect(stored.closingCard).toEqual(CLOSING);
  });

  it("names the first picture by its asset id after a round trip", () => {
    const written = serverDocumentFor(withCards);
    const read = readServerDocument(JSON.parse(JSON.stringify(written)));
    const stored = storedSlideshowFrom("device-id", read);
    expect(stored.pictures.map((picture) => picture.id)).toEqual([ASSET_A, ASSET_B]);
  });

  it("refuses a pictureIndex out of range", () => {
    const written = serverDocumentFor(withCards);
    const text = {
      ...written,
      slideshow: {
        ...written.slideshow,
        openingCard: {
          ...written.slideshow.openingCard,
          background: { kind: "picture", pictureIndex: 5, fade: 60 },
        },
      },
    };
    expect(readFails(text)).toBe(
      "slideshow.openingCard.background.pictureIndex: expected a whole number from 0 to 1, got 5",
    );
  });
});
