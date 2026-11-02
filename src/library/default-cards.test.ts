import { describe, expect, it } from "vitest";
import { dayRangeForCaptureRange } from "../compose/day-range-for-capture-range";
import { cardWithoutPicture, defaultClosingCard, defaultOpeningCard } from "./default-cards";
import type { CardTint, StoredCard, StoredSlideshow } from "./stored-slideshow";

function slideshowWith(pictureIds: readonly string[]): StoredSlideshow {
  return {
    id: "show-1",
    title: "Herbst in Wien",
    createdAt: "2025-10-01T08:00:00.000Z",
    pictures: pictureIds.map((id, index) => ({
      id,
      capturedAt: `2025-09-${30 - index}T10:00:00Z`,
      width: 10,
      height: 10,
      fileName: `${id}.jpg`,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    })),
    songs: [],
    secondsPerPicture: 5,
  };
}

describe("defaultOpeningCard", () => {
  it("defaults to the slideshow's title, over the first picture, with reveal on", () => {
    const card = defaultOpeningCard(slideshowWith(["p1", "p2"]), "en");
    expect(card.title).toBe("Herbst in Wien");
    expect(card.background).toMatchObject({ kind: "picture", pictureId: "p1" });
    expect(card.motion).toBe(true);
  });

  it.each([
    {
      name: "the title is still the automatic month title: the subtitle is empty",
      title: "September 2025",
      pictureIds: ["p1", "p2"],
      subtitle: "",
    },
    {
      name: "the title was renamed: the subtitle is the capture day range",
      title: "Herbst in Wien",
      pictureIds: ["p1", "p2"],
      subtitle: "September 29 – 30, 2025",
    },
    {
      name: "the title was renamed, a single capture day: the subtitle is that one day",
      title: "Herbst in Wien",
      pictureIds: ["p1"],
      subtitle: "September 30, 2025",
    },
  ])("$name", ({ title, pictureIds, subtitle }) => {
    const card = defaultOpeningCard({ ...slideshowWith(pictureIds), title }, "en");
    expect(card.subtitle).toBe(subtitle);
  });

  it("leaves the subtitle empty when the title already is the capture day range", () => {
    const dayRange = dayRangeForCaptureRange(
      ["2025-09-29T10:00:00Z", "2025-09-30T10:00:00Z"],
      "en",
    );
    const card = defaultOpeningCard({ ...slideshowWith(["p1", "p2"]), title: dayRange }, "en");
    expect(card.title).toBe(dayRange);
    expect(card.subtitle).toBe("");
  });

  it("keeps the capture day range as the subtitle of a numbered month title", () => {
    const card = defaultOpeningCard(
      { ...slideshowWith(["p1", "p2"]), title: "September 2025 · 2" },
      "en",
    );
    expect(card.subtitle).toBe(
      dayRangeForCaptureRange(["2025-09-29T10:00:00Z", "2025-09-30T10:00:00Z"], "en"),
    );
  });

  it("throws for a slideshow with no pictures", () => {
    expect(() => defaultOpeningCard({ ...slideshowWith([]), pictures: [] }, "en-US")).toThrow(
      RangeError,
    );
  });
});

describe("defaultClosingCard", () => {
  it("defaults to an empty title, over the last picture", () => {
    const card = defaultClosingCard(slideshowWith(["p1", "p2"]));
    expect(card.title).toBe("");
    expect(card.background).toMatchObject({ kind: "picture", pictureId: "p2" });
  });

  it("throws for a slideshow with no pictures", () => {
    expect(() => defaultClosingCard({ ...slideshowWith([]), pictures: [] })).toThrow(RangeError);
  });
});

describe("cardWithoutPicture", () => {
  const cardOn = (pictureId: string, tint: CardTint = "picture"): StoredCard => ({
    title: "Title",
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: { kind: "picture", pictureId, fade: 60, tint },
    motion: true,
  });

  it("leaves a card unchanged while its picture is not removed", () => {
    const card = cardOn("p1");
    expect(cardWithoutPicture(card, new Set(["p2"]), "p3")).toBe(card);
  });

  it("leaves a card with a colour background unchanged", () => {
    const card: StoredCard = { ...cardOn("p1"), background: { kind: "colour", colour: "plum" } };
    expect(cardWithoutPicture(card, new Set(["p1"]), "p3")).toBe(card);
  });

  it("leaves undefined as undefined", () => {
    expect(cardWithoutPicture(undefined, new Set(["p1"]), "p3")).toBeUndefined();
  });

  it("moves to the fallback picture, keeping the fade and tint, when its picture is removed", () => {
    const card = cardOn("p1");
    expect(cardWithoutPicture(card, new Set(["p1"]), "p3")).toEqual({
      ...card,
      background: { kind: "picture", pictureId: "p3", fade: 60, tint: "picture" },
    });
  });

  it("keeps a non-default tint too, when its picture is removed", () => {
    const card = cardOn("p1", "dark");
    expect(cardWithoutPicture(card, new Set(["p1"]), "p3")).toEqual({
      ...card,
      background: { kind: "picture", pictureId: "p3", fade: 60, tint: "dark" },
    });
  });

  it("falls back to the plum swatch when no picture is left", () => {
    const card = cardOn("p1");
    expect(cardWithoutPicture(card, new Set(["p1"]), undefined)).toEqual({
      ...card,
      background: { kind: "colour", colour: "plum" },
    });
  });
});
