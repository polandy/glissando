import { describe, expect, it } from "vitest";
import { PAIR_GAP_SHARE, slideLayout } from "./slide-layout";

const STILL_MOTION = {
  kenBurns: {
    from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
    to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
    easing: "linear" as const,
  },
  progress: 0,
};

const LANDSCAPE_SCREEN = { width: 1920, height: 1080 };
const PORTRAIT_SCREEN = { width: 1080, height: 1920 };
const PICTURE_4_3 = { width: 1200, height: 900 };
const PICTURE_3_4 = { width: 900, height: 1200 };

describe("slideLayout: single picture", () => {
  it("covers when covering hides a third of the picture or less", () => {
    // 4:3 picture on a 16:9 screen hides exactly a quarter of it.
    const layout = slideLayout({ picture: PICTURE_4_3, motion: STILL_MOTION }, LANDSCAPE_SCREEN);

    expect(layout.kind).toBe("cover");
  });

  it("draws the whole picture over a blurred fill once covering hides more than a third", () => {
    const layout = slideLayout({ picture: PICTURE_3_4, motion: STILL_MOTION }, LANDSCAPE_SCREEN);

    expect(layout.kind).toBe("blurred-fill");
  });

  it("centres the whole picture's contained rect inside the screen", () => {
    const layout = slideLayout({ picture: PICTURE_3_4, motion: STILL_MOTION }, LANDSCAPE_SCREEN);
    if (layout.kind !== "blurred-fill") {
      throw new Error("expected a blurred fill");
    }

    const pictureAspect = PICTURE_3_4.width / PICTURE_3_4.height;
    const screenAspect = LANDSCAPE_SCREEN.width / LANDSCAPE_SCREEN.height;
    expect(layout.frontRect.height).toBe(1);
    expect(layout.frontRect.width).toBeCloseTo(pictureAspect / screenAspect, 10);
    expect(layout.frontRect.x).toBeCloseTo((1 - layout.frontRect.width) / 2, 10);
    expect(layout.frontRect.y).toBe(0);
  });

  it("crops the front picture's Ken Burns motion against its own shape, not the screen", () => {
    const layout = slideLayout({ picture: PICTURE_3_4, motion: STILL_MOTION }, LANDSCAPE_SCREEN);
    if (layout.kind !== "blurred-fill") {
      throw new Error("expected a blurred fill");
    }

    // Still motion, zoom 1: the front crop is the whole picture, whatever the screen's shape.
    expect(layout.frontCrop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it("crops the backdrop to cover the whole screen, unmoved by Ken Burns", () => {
    const layout = slideLayout({ picture: PICTURE_3_4, motion: STILL_MOTION }, LANDSCAPE_SCREEN);
    if (layout.kind !== "blurred-fill") {
      throw new Error("expected a blurred fill");
    }

    const screenAspect = LANDSCAPE_SCREEN.width / LANDSCAPE_SCREEN.height;
    const pictureAspect = PICTURE_3_4.width / PICTURE_3_4.height;
    expect(layout.backdropCrop.width).toBe(1);
    expect(layout.backdropCrop.height).toBeCloseTo(pictureAspect / screenAspect, 10);
  });

  it("covers regardless of hidden share when fit is cover", () => {
    const layout = slideLayout(
      { picture: PICTURE_3_4, motion: STILL_MOTION, fit: "cover" },
      LANDSCAPE_SCREEN,
    );

    expect(layout.kind).toBe("cover");
  });

  it("covers right up to hiding a third, then switches to the blurred fill just past it", () => {
    // A picture's aspect ratio relative to the screen's that hides exactly a third of it,
    // nudged a fraction either way so float rounding at the exact boundary cannot flip the case.
    const screenAspect = LANDSCAPE_SCREEN.width / LANDSCAPE_SCREEN.height;
    const boundaryPictureAspect = (2 / 3) * screenAspect;
    // A wider picture hides less of itself covering the screen, so cover is just past the
    // boundary going up, and the blurred fill just before it going down.
    const justInside = { width: boundaryPictureAspect * 1.001, height: 1 };
    const justOutside = { width: boundaryPictureAspect * 0.999, height: 1 };

    expect(slideLayout({ picture: justInside, motion: STILL_MOTION }, LANDSCAPE_SCREEN).kind).toBe(
      "cover",
    );
    expect(slideLayout({ picture: justOutside, motion: STILL_MOTION }, LANDSCAPE_SCREEN).kind).toBe(
      "blurred-fill",
    );
  });
});

describe("slideLayout: pair", () => {
  const partner = { picture: PICTURE_3_4, motion: STILL_MOTION };

  it("splits a landscape screen side by side, image left and partner right", () => {
    const layout = slideLayout(
      { picture: PICTURE_3_4, motion: STILL_MOTION, partner },
      LANDSCAPE_SCREEN,
    );
    if (layout.kind !== "pair-across") {
      throw new Error("expected a side-by-side pair");
    }

    expect(layout.firstRect.x).toBe(0);
    expect(layout.secondRect.x).toBeGreaterThan(layout.firstRect.x + layout.firstRect.width);
    expect(layout.firstRect.width).toBeCloseTo(layout.secondRect.width, 10);
    expect(layout.firstRect.height).toBe(1);
    expect(layout.secondRect.height).toBe(1);
  });

  it("leaves a gap sized as a share of the screen's long side between the halves", () => {
    const layout = slideLayout(
      { picture: PICTURE_3_4, motion: STILL_MOTION, partner },
      LANDSCAPE_SCREEN,
    );
    if (layout.kind !== "pair-across") {
      throw new Error("expected a side-by-side pair");
    }

    const gap = layout.secondRect.x - (layout.firstRect.x + layout.firstRect.width);
    expect(gap).toBeCloseTo(PAIR_GAP_SHARE, 10);
  });

  it("stacks a portrait screen, image on top and partner below", () => {
    const layout = slideLayout(
      { picture: PICTURE_3_4, motion: STILL_MOTION, partner },
      PORTRAIT_SCREEN,
    );
    if (layout.kind !== "pair-stacked") {
      throw new Error("expected a stacked pair");
    }

    expect(layout.firstRect.y).toBe(0);
    expect(layout.secondRect.y).toBeGreaterThan(layout.firstRect.y + layout.firstRect.height);
    expect(layout.firstRect.width).toBe(1);
    expect(layout.secondRect.width).toBe(1);
  });

  it("covers each half with its own picture's crop, not the whole screen's", () => {
    const layout = slideLayout(
      { picture: PICTURE_4_3, motion: STILL_MOTION, partner },
      LANDSCAPE_SCREEN,
    );
    if (layout.kind !== "pair-across") {
      throw new Error("expected a side-by-side pair");
    }

    // Each half is narrower than the full screen, so a 4:3 picture is cropped at the sides more
    // than it would be covering the whole 16:9 screen by itself.
    expect(layout.firstCrop.width).toBeLessThan(1);
    expect(layout.firstCrop.height).toBe(1);
  });
});
