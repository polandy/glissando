import { describe, expect, it } from "vitest";
import {
  checkCardColour,
  checkCardFade,
  checkCardMotion,
  checkCardPosition,
  checkCardStyle,
  checkCardText,
  checkCardTint,
  checkStoredCard,
  InvalidCardError,
  type CardInput,
} from "./stored-card";

const PICTURE_IDS = new Set(["p1", "p2"]);

const VALID_INPUT: CardInput = {
  title: "Herbst in Wien",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "colour", colour: "plum" },
  motion: true,
};

describe("checkCardText", () => {
  it("accepts an empty string: no title or subtitle shown", () => {
    expect(checkCardText("", "card", "title")).toBe("");
  });

  it("accepts a caption-shaped string", () => {
    expect(checkCardText("Herbst in Wien", "card", "title")).toBe("Herbst in Wien");
  });

  it("rejects anything else, naming the field", () => {
    expect(() => checkCardText(42, "card", "subtitle")).toThrow(InvalidCardError);
    expect(() => checkCardText(42, "card", "subtitle")).toThrow(/subtitle/);
  });
});

describe("checkCardStyle, checkCardPosition, checkCardMotion", () => {
  it("accepts a style and a position from the fixed lists", () => {
    expect(checkCardStyle("modern", "card")).toBe("modern");
    expect(checkCardPosition("centre", "card")).toBe("centre");
  });

  it("rejects a style or position outside the fixed lists", () => {
    expect(() => checkCardStyle("fancy", "card")).toThrow(InvalidCardError);
    expect(() => checkCardPosition("middle", "card")).toThrow(InvalidCardError);
  });

  it("accepts true or false for motion, rejecting anything else", () => {
    expect(checkCardMotion(true, "card")).toBe(true);
    expect(checkCardMotion(false, "card")).toBe(false);
    expect(() => checkCardMotion("yes", "card")).toThrow(InvalidCardError);
  });
});

describe("checkCardFade", () => {
  it.each([0, 5, 60, 100])("accepts %d, a step of 5 from 0 to 100", (value) => {
    expect(checkCardFade(value, "card")).toBe(value);
  });

  it.each([-5, 101, 3, 1.5])("rejects %d", (value) => {
    expect(() => checkCardFade(value, "card")).toThrow(InvalidCardError);
  });
});

describe("checkCardTint", () => {
  it.each(["picture", "light", "dark"] as const)("accepts %s", (value) => {
    expect(checkCardTint(value, "card")).toBe(value);
  });

  it("rejects anything outside the fixed list", () => {
    expect(() => checkCardTint("plum", "card")).toThrow(InvalidCardError);
    expect(() => checkCardTint(undefined, "card")).toThrow(InvalidCardError);
  });
});

describe("checkCardColour", () => {
  it("accepts a swatch id", () => {
    expect(checkCardColour("plum", "card")).toBe("plum");
  });

  it("rejects a colour outside the swatches", () => {
    expect(() => checkCardColour("magenta", "card")).toThrow(InvalidCardError);
  });
});

describe("checkStoredCard", () => {
  it("accepts a valid card with a colour background", () => {
    expect(checkStoredCard(VALID_INPUT, PICTURE_IDS, "card")).toEqual(VALID_INPUT);
  });

  it("accepts a picture background whose pictureId is in the slideshow", () => {
    const input: CardInput = {
      ...VALID_INPUT,
      background: { kind: "picture", pictureId: "p1", fade: 60, tint: "picture" },
    };
    expect(checkStoredCard(input, PICTURE_IDS, "card")).toEqual(input);
  });

  it("rejects a picture background whose pictureId is not in the slideshow", () => {
    const input: CardInput = {
      ...VALID_INPUT,
      background: { kind: "picture", pictureId: "unknown", fade: 60, tint: "picture" },
    };
    expect(() => checkStoredCard(input, PICTURE_IDS, "card")).toThrow(InvalidCardError);
  });

  it("rejects a picture background whose tint is not one of the fixed list", () => {
    const input: CardInput = {
      ...VALID_INPUT,
      background: { kind: "picture", pictureId: "p1", fade: 60, tint: "sepia" },
    };
    expect(() => checkStoredCard(input, PICTURE_IDS, "card")).toThrow(InvalidCardError);
  });

  it("rejects a background kind that is neither colour nor picture", () => {
    const input: CardInput = { ...VALID_INPUT, background: { kind: "gradient" } };
    expect(() => checkStoredCard(input, PICTURE_IDS, "card")).toThrow(InvalidCardError);
  });

  it("keeps a subtitle only when one is given", () => {
    expect(checkStoredCard(VALID_INPUT, PICTURE_IDS, "card")).not.toHaveProperty("subtitle");
    expect(
      checkStoredCard({ ...VALID_INPUT, subtitle: "2025" }, PICTURE_IDS, "card"),
    ).toHaveProperty("subtitle", "2025");
  });
});
