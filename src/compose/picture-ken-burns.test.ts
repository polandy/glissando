import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../library/stored-slideshow";
import { autoKenBurns } from "./auto-ken-burns";
import { pictureKenBurns } from "./picture-ken-burns";

const automatic: StoredPicture = {
  id: "a",
  capturedAt: "2025-07-01T10:00:00Z",
  width: 400,
  height: 300,
  fileName: "a.jpg",
};
const own = {
  from: { zoom: 2.5, centerX: 0.3, centerY: 0.7 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};

const FOCUS = { kind: "subject", box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 } } as const;

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
});
