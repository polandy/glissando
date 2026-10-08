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

describe("pictureKenBurns", () => {
  it("is the automatic motion for the picture's position while it has none of its own", () => {
    expect(pictureKenBurns(3, automatic)).toEqual(autoKenBurns(3, automatic));
  });

  it("is the picture's own motion, whatever its position, eased like the automatic one", () => {
    const picture = { ...automatic, kenBurns: own };

    expect(pictureKenBurns(0, picture)).toEqual({
      ...own,
      easing: autoKenBurns(0, picture).easing,
    });
    expect(pictureKenBurns(1, picture)).toEqual(pictureKenBurns(0, picture));
  });
});
