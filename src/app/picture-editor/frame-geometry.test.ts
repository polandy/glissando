import { describe, expect, it } from "vitest";
import { MAX_OWN_KEN_BURNS_ZOOM } from "../../library/own-ken-burns";
import {
  fittedFraming,
  frameRect,
  framingForKey,
  movedFraming,
  playheadRect,
  resizedFraming,
  wheelZoomedFraming,
  zoomedFraming,
} from "./frame-geometry";

/** 4:3: at zoom 1 a 16:9 frame takes the full width and three quarters of the height. */
const LANDSCAPE = { width: 400, height: 300 };
const CENTRE = { zoom: 1, centerX: 0.5, centerY: 0.5 };

describe("frameRect", () => {
  it("at zoom 1 is the largest 16:9 part of the picture, as the player crops it", () => {
    const rect = frameRect(CENTRE, LANDSCAPE);

    expect(rect.width).toBeCloseTo(1);
    expect(rect.height).toBeCloseTo(0.75);
    expect(rect.y).toBeCloseTo(0.125);
  });

  it("at zoom 2 is half as wide and half as high", () => {
    const rect = frameRect({ ...CENTRE, zoom: 2 }, LANDSCAPE);

    expect(rect).toEqual({ x: 0.25, y: expect.closeTo(0.3125), width: 0.5, height: 0.375 });
  });
});

describe("playheadRect", () => {
  it("runs straight between the start and end frames as the picture's edges hold them", () => {
    const fromEdge = { zoom: 1.2, centerX: 0.05, centerY: 0.5 };
    const toCentre = { zoom: 2, centerX: 0.5, centerY: 0.5 };
    const centreX = ({ x, width }: { x: number; width: number }) => x + width / 2;

    const halfway = playheadRect(
      { kenBurns: { from: fromEdge, to: toCentre, easing: "linear" }, progress: 0.5 },
      LANDSCAPE,
    );

    const start = centreX(frameRect(fromEdge, LANDSCAPE));
    const end = centreX(frameRect(toCentre, LANDSCAPE));
    expect(centreX(halfway)).toBeCloseTo((start + end) / 2, 12);
  });
});

describe("fittedFraming", () => {
  it.each([
    ["a zoom below 1", { ...CENTRE, zoom: 0.5 }, 1],
    ["a zoom above the maximum", { ...CENTRE, zoom: 9 }, MAX_OWN_KEN_BURNS_ZOOM],
  ])("brings %s into range", (_, framing, zoom) => {
    expect(fittedFraming(framing, LANDSCAPE).zoom).toBe(zoom);
  });

  it("moves the centre so the frame stays inside the picture", () => {
    const fitted = fittedFraming({ zoom: 2, centerX: 0.95, centerY: 0.01 }, LANDSCAPE);

    expect(fitted.centerX).toBeCloseTo(0.75);
    expect(fitted.centerY).toBeCloseTo(0.1875);
  });
});

describe("movedFraming", () => {
  it("moves the centre by the drag, in picture coordinates", () => {
    const moved = movedFraming({ zoom: 2, centerX: 0.5, centerY: 0.5 }, 0.1, -0.05, LANDSCAPE);

    expect(moved.centerX).toBeCloseTo(0.6);
    expect(moved.centerY).toBeCloseTo(0.45);
  });

  it("stops at the picture's edge", () => {
    expect(movedFraming(CENTRE, 0.3, 0, LANDSCAPE).centerX).toBeCloseTo(0.5);
  });
});

describe("resizedFraming", () => {
  it("dragging the bottom-right corner in zooms about the top-left corner, which stays put", () => {
    const start = { zoom: 2, centerX: 0.5, centerY: 0.5 };
    const anchor = frameRect(start, LANDSCAPE);

    const corner = { x: anchor.x + anchor.width * 0.8, y: anchor.y + anchor.height * 0.8 };
    const resized = resizedFraming(start, "se", corner, LANDSCAPE);

    const rect = frameRect(resized, LANDSCAPE);
    expect(resized.zoom).toBeCloseTo(2 / 0.8);
    expect(rect.x).toBeCloseTo(anchor.x);
    expect(rect.y).toBeCloseTo(anchor.y);
  });

  it("keeps 16:9: the larger of both drag directions sets the size", () => {
    const start = { zoom: 2, centerX: 0.5, centerY: 0.5 };
    const anchor = frameRect(start, LANDSCAPE);

    const resized = resizedFraming(start, "se", { x: anchor.x + 0.1, y: 0.9 }, LANDSCAPE);

    const rect = frameRect(resized, LANDSCAPE);
    expect(rect.height).toBeCloseTo(0.9 - anchor.y);
    expect(rect.width / rect.height).toBeCloseTo(1 / 0.75);
  });

  it("dragging the top-left corner out grows about the bottom-right corner", () => {
    const start = { zoom: 2, centerX: 0.5, centerY: 0.5 };
    const before = frameRect(start, LANDSCAPE);

    const resized = resizedFraming(start, "nw", { x: 0.2, y: 0.25 }, LANDSCAPE);

    const rect = frameRect(resized, LANDSCAPE);
    expect(resized.zoom).toBeLessThan(2);
    expect(rect.x + rect.width).toBeCloseTo(before.x + before.width);
    expect(rect.y + rect.height).toBeCloseTo(before.y + before.height);
  });
});

describe("zooming", () => {
  it("zooms to the given factor, within range", () => {
    expect(zoomedFraming(CENTRE, 2.5, LANDSCAPE).zoom).toBe(2.5);
    expect(zoomedFraming(CENTRE, 7, LANDSCAPE).zoom).toBe(MAX_OWN_KEN_BURNS_ZOOM);
  });

  it("the wheel rolled towards the user zooms out, away zooms in", () => {
    const start = { ...CENTRE, zoom: 2 };

    expect(wheelZoomedFraming(start, 100, LANDSCAPE).zoom).toBeLessThan(2);
    expect(wheelZoomedFraming(start, -100, LANDSCAPE).zoom).toBeGreaterThan(2);
  });
});

describe("framingForKey", () => {
  const start = { zoom: 2, centerX: 0.5, centerY: 0.5 };

  it.each([
    ["ArrowLeft", false, { centerX: 0.49 }],
    ["ArrowRight", false, { centerX: 0.51 }],
    ["ArrowUp", false, { centerY: 0.49 }],
    ["ArrowDown", true, { centerY: 0.55 }],
    ["+", false, { zoom: 2.05 }],
    ["=", false, { zoom: 2.05 }],
    ["-", false, { zoom: 1.95 }],
  ])("%s (Shift %s) changes the framing to %o", (key, shift, change) => {
    const changed = framingForKey(start, key, shift, LANDSCAPE);

    expect(changed).not.toBeNull();
    for (const [field, value] of Object.entries(change)) {
      expect(changed?.[field as keyof typeof change]).toBeCloseTo(value);
    }
  });

  it("ignores any other key, so it keeps its usual meaning", () => {
    expect(framingForKey(start, "Tab", false, LANDSCAPE)).toBeNull();
  });
});
