import { describe, expect, it } from "vitest";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { pictureFit } from "./picture-fit";

function picture(id: string, width: number, height: number): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width,
    height,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

describe("pictureFit", () => {
  it("counts both pictures of a pair in the fitted share (ADR-0028)", () => {
    // Two portraits are paired into one slide of 6 s, the landscape is a slide of 3 s: three
    // automatic pictures, (6 + 6 + 3) / 3 = 5 s each; counting slides would give 4.5 s.
    const stored: StoredSlideshow = {
      id: "show",
      title: "Sommer am See",
      createdAt: "2025-07-02T00:00:00Z",
      pictures: [picture("a", 900, 1600), picture("b", 900, 1600), picture("c", 1600, 900)],
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
      secondsPerPicture: 5,
      songs: [],
    };

    expect(pictureFit(stored, [6000, 3000], 9000, true)).toEqual({ fittedShareMs: 5000 });
  });
});
