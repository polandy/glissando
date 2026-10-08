import { describe, expect, it } from "vitest";
import { layerTransform } from "./layer-transform";

describe("layerTransform", () => {
  it("scales the crop to the viewport and moves its corner to the origin", () => {
    const crop = { x: 0.25, y: 0, width: 0.5, height: 1 };

    expect(layerTransform(crop, { width: 4000, height: 2000 }, { width: 500, height: 500 })).toBe(
      "translate(-250px, 0px) scale(0.25)",
    );
  });

  it("moves a crop off the top edge up", () => {
    const crop = { x: 0, y: 0.5, width: 0.5, height: 0.5 };

    expect(layerTransform(crop, { width: 1000, height: 1000 }, { width: 1000, height: 1000 })).toBe(
      "translate(0px, -1000px) scale(2)",
    );
  });
});
