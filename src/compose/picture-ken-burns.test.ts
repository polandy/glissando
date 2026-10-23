import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../library/stored-slideshow";
import { autoKenBurns } from "./auto-ken-burns";
import { pairKenBurns, pictureKenBurns } from "./picture-ken-burns";

const automatic: StoredPicture = {
  id: "a",
  capturedAt: "2025-07-01T10:00:00Z",
  width: 400,
  height: 300,
  fileName: "a.jpg",
  colours: { veil: "#404040", accent: "#C0C0C0" },
};
const portraitA: StoredPicture = { ...automatic, id: "a", width: 300, height: 400 };
const portraitB: StoredPicture = { ...automatic, id: "b", width: 300, height: 400 };
const own = {
  from: { zoom: 2.5, centerX: 0.3, centerY: 0.7 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};

const FOCUS = {
  kind: "subject",
  box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  foundBy: "face",
} as const;

describe("pictureKenBurns", () => {
  it("is the automatic motion for the picture's position while it has none of its own", () => {
    expect(pictureKenBurns(3, automatic, undefined)).toEqual(autoKenBurns(3, automatic));
  });

  it("is the picture's own motion, whatever its position, eased like the automatic one", () => {
    const picture = { ...automatic, kenBurns: own };

    expect(pictureKenBurns(0, picture, undefined)).toEqual({
      ...own,
      easing: autoKenBurns(0, picture).easing,
    });
    expect(pictureKenBurns(1, picture, undefined)).toEqual(pictureKenBurns(0, picture, undefined));
  });

  it("keeps the picture's own motion over the automatic one aimed at its focus", () => {
    const picture = { ...automatic, kenBurns: own };

    expect(pictureKenBurns(0, picture, FOCUS)).toEqual(pictureKenBurns(0, picture, undefined));
  });

  it("aims the automatic motion at the picture's focus", () => {
    expect(pictureKenBurns(0, automatic, FOCUS).from.centerY).toBeCloseTo(0.2);
  });

  it("scales the automatic motion by a mood's Ken Burns strength", () => {
    expect(pictureKenBurns(0, automatic, undefined, 0.5)).toEqual(
      autoKenBurns(0, automatic, undefined, true, 0.5),
    );
  });

  it("keeps the picture's own motion over a mood's strength", () => {
    const picture = { ...automatic, kenBurns: own };

    expect(pictureKenBurns(0, picture, undefined, 0.5)).toEqual(
      pictureKenBurns(0, picture, undefined),
    );
  });
});

describe("pairKenBurns", () => {
  it("gives each half its own automatic motion, aimed at its own focus", () => {
    const { first, second } = pairKenBurns(0, portraitA, FOCUS, portraitB, undefined);

    expect(first.from.centerY).toBeCloseTo(0.2);
    expect(second).toEqual(autoKenBurns(0, portraitB, undefined, false));
  });

  it("never pans horizontally, so the two halves stay in step", () => {
    const { first, second } = pairKenBurns(1, portraitA, undefined, portraitB, undefined);

    expect(first.from.centerX).toBe(first.to.centerX);
    expect(second.from.centerX).toBe(second.to.centerX);
  });

  it("zooms both halves the same direction", () => {
    const { first, second } = pairKenBurns(0, portraitA, undefined, portraitB, undefined);

    expect(first.from.zoom < first.to.zoom).toBe(second.from.zoom < second.to.zoom);
  });

  it("scales both halves' motion by a mood's Ken Burns strength", () => {
    const { first, second } = pairKenBurns(0, portraitA, undefined, portraitB, undefined, 0.5);

    expect(first).toEqual(autoKenBurns(0, portraitA, undefined, false, 0.5));
    expect(second).toEqual(autoKenBurns(0, portraitB, undefined, false, 0.5));
  });
});
