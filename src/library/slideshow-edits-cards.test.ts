import { describe, expect, it } from "vitest";
import { InvalidCardError, type CardInput } from "./stored-card";
import {
  setClosingCard,
  setOpeningCard,
  withPicturesAfterCardRemoval,
} from "./slideshow-edits-cards";
import { removePicture, takeOutPictures } from "./slideshow-edits";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

function picture(id: string): StoredPicture {
  return { id, capturedAt: "2025-09-30T10:00:00Z", width: 10, height: 10, fileName: `${id}.jpg` };
}

function slideshowWith(ids: readonly string[]): StoredSlideshow {
  return {
    id: "show-1",
    title: "Herbst in Wien",
    createdAt: "2025-10-01T08:00:00.000Z",
    pictures: ids.map(picture),
    songs: [],
    secondsPerPicture: 5,
  };
}

const CARD_ON_P1: CardInput = {
  title: "Title",
  style: "modern",
  position: "centre",
  background: { kind: "picture", pictureId: "p1", fade: 60 },
  motion: true,
};

describe("setOpeningCard, setClosingCard", () => {
  it("sets the card after validating it", () => {
    const slideshow = slideshowWith(["p1", "p2"]);
    expect(setOpeningCard(slideshow, CARD_ON_P1).openingCard).toEqual(CARD_ON_P1);
  });

  it("removes the card when given undefined", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1", "p2"]), CARD_ON_P1);
    expect(setOpeningCard(slideshow, undefined)).not.toHaveProperty("openingCard");
  });

  it("rejects a card whose background names a picture the slideshow does not hold", () => {
    const slideshow = slideshowWith(["p1", "p2"]);
    const bad: CardInput = {
      ...CARD_ON_P1,
      background: { kind: "picture", pictureId: "unknown", fade: 60 },
    };
    expect(() => setOpeningCard(slideshow, bad)).toThrow(InvalidCardError);
  });

  it("sets the closing card independently of the opening card", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1", "p2"]), CARD_ON_P1);
    const withClosing = setClosingCard(slideshow, { ...CARD_ON_P1, title: "Fin" });
    expect(withClosing.openingCard).toEqual(CARD_ON_P1);
    expect(withClosing.closingCard).toMatchObject({ title: "Fin" });
  });
});

describe("withPicturesAfterCardRemoval", () => {
  it("moves the opening card to the first remaining picture when its own leaves", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1", "p2", "p3"]), CARD_ON_P1);
    const pictures = slideshow.pictures.filter((p) => p.id !== "p1");
    const result = withPicturesAfterCardRemoval(slideshow, pictures, new Set(["p1"]));
    expect(result.openingCard).toMatchObject({
      background: { kind: "picture", pictureId: "p2" },
    });
  });

  it("moves the closing card to the last remaining picture when its own leaves", () => {
    const slideshow = setClosingCard(slideshowWith(["p1", "p2", "p3"]), {
      ...CARD_ON_P1,
      background: { kind: "picture", pictureId: "p3", fade: 60 },
    });
    const pictures = slideshow.pictures.filter((p) => p.id !== "p3");
    const result = withPicturesAfterCardRemoval(slideshow, pictures, new Set(["p3"]));
    expect(result.closingCard).toMatchObject({
      background: { kind: "picture", pictureId: "p2" },
    });
  });

  it("falls back to the plum swatch once every picture is gone", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1"]), CARD_ON_P1);
    const result = withPicturesAfterCardRemoval(slideshow, [], new Set(["p1"]));
    expect(result.openingCard).toMatchObject({ background: { kind: "colour", colour: "plum" } });
  });

  it("leaves a card untouched when its picture is not among the ones removed", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1", "p2"]), CARD_ON_P1);
    const pictures = slideshow.pictures.filter((p) => p.id !== "p2");
    const result = withPicturesAfterCardRemoval(slideshow, pictures, new Set(["p2"]));
    expect(result.openingCard).toEqual(CARD_ON_P1);
  });
});

describe("removePicture and takeOutPictures carry a card's picture fallback", () => {
  it("removePicture moves the opening card off the picture it removes", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1", "p2"]), CARD_ON_P1);
    const { slideshow: after } = removePicture(slideshow, "p1");
    expect(after.openingCard).toMatchObject({ background: { kind: "picture", pictureId: "p2" } });
  });

  it("takeOutPictures moves the opening card off a removed picture", () => {
    const slideshow = setOpeningCard(slideshowWith(["p1", "p2", "p3"]), CARD_ON_P1);
    const after = takeOutPictures(slideshow, ["p1"]);
    expect(after.openingCard).toMatchObject({ background: { kind: "picture", pictureId: "p2" } });
  });
});
