import { describe, expect, it } from "vitest";
import { LAYOUT_CODE, glScreenRect, layerUniformRects } from "./layer-uniforms";
import type { SlideLayout } from "../slide-layout";

const CROP = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
const FRONT_CROP = { x: 0, y: 0, width: 1, height: 1 };
const RECT = { x: 0.05, y: 0, width: 0.9, height: 1 };
const SECOND_RECT = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

describe("layerUniformRects", () => {
  it("binds a cover layout's crop and leaves the others at zero", () => {
    const layout: SlideLayout = { kind: "cover", crop: CROP };

    expect(layerUniformRects(layout)).toEqual({
      crop: CROP,
      secondCrop: { x: 0, y: 0, width: 0, height: 0 },
      rect: { x: 0, y: 0, width: 0, height: 0 },
      rect2: { x: 0, y: 0, width: 0, height: 0 },
    });
  });

  it("binds a blurred fill's backdrop as the crop and the front picture as the second crop and rect", () => {
    const layout: SlideLayout = {
      kind: "blurred-fill",
      frontRect: RECT,
      frontCrop: FRONT_CROP,
      backdropCrop: CROP,
    };

    expect(layerUniformRects(layout)).toEqual({
      crop: CROP,
      secondCrop: FRONT_CROP,
      rect: RECT,
      rect2: { x: 0, y: 0, width: 0, height: 0 },
    });
  });

  it("binds a pair's first half as the crop and rect, the second half as the second crop and rect2", () => {
    const layout: SlideLayout = {
      kind: "pair-across",
      firstRect: RECT,
      firstCrop: CROP,
      secondRect: SECOND_RECT,
      secondCrop: FRONT_CROP,
    };

    expect(layerUniformRects(layout)).toEqual({
      crop: CROP,
      secondCrop: FRONT_CROP,
      rect: RECT,
      rect2: SECOND_RECT,
    });
  });

  it("gives a stacked pair the same layout code as a side-by-side one: the rects already carry the direction", () => {
    expect(LAYOUT_CODE["pair-stacked"]).toBe(LAYOUT_CODE["pair-across"]);
    expect(LAYOUT_CODE.cover).not.toBe(LAYOUT_CODE["pair-across"]);
    expect(LAYOUT_CODE["blurred-fill"]).not.toBe(LAYOUT_CODE.cover);
  });
});

describe("glScreenRect", () => {
  it("flips a top-left-origin screen rect to the shader's bottom-left origin", () => {
    // A rect across the top quarter of the screen (top-left origin) sits at the top in
    // bottom-left terms: y = 1 - (0 + 0.25) = 0.75.
    expect(glScreenRect({ x: 0, y: 0, width: 1, height: 0.25 })).toEqual({
      x: 0,
      y: 0.75,
      width: 1,
      height: 0.25,
    });
  });

  it("keeps a rect flush with the screen's bottom in top-left terms flush with the top in GL terms", () => {
    expect(glScreenRect({ x: 0, y: 0.75, width: 1, height: 0.25 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 0.25,
    });
  });
});
