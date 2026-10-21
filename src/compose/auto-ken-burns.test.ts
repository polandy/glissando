import { describe, expect, it } from "vitest";
import { autoKenBurns, SMALLEST_ZOOM_TRAVEL } from "./auto-ken-burns";
import { cropRect } from "../player/ken-burns";
import { MIN_KEN_BURNS_ZOOM } from "../player/slideshow";

const LANDSCAPE = { width: 400, height: 300 };
const PORTRAIT = { width: 300, height: 400 };

describe("autoKenBurns", () => {
  it("zooms in on an even index", () => {
    const { from, to } = autoKenBurns(0, LANDSCAPE);

    expect(from.zoom).toBeLessThan(to.zoom);
  });

  it("zooms out on an odd index", () => {
    const { from, to } = autoKenBurns(1, LANDSCAPE);

    expect(from.zoom).toBeGreaterThan(to.zoom);
  });

  it("alternates the zoom direction across consecutive slides", () => {
    const even = autoKenBurns(2, LANDSCAPE);
    const odd = autoKenBurns(3, LANDSCAPE);

    expect(even.from.zoom < even.to.zoom).toBe(true);
    expect(odd.from.zoom < odd.to.zoom).toBe(false);
  });

  it.each([0, 1, 2, 3])("keeps zoom within MIN_KEN_BURNS_ZOOM..1.2 at index %d", (index) => {
    const { from, to } = autoKenBurns(index, LANDSCAPE);

    for (const framing of [from, to]) {
      expect(framing.zoom).toBeGreaterThanOrEqual(MIN_KEN_BURNS_ZOOM);
      expect(framing.zoom).toBeLessThanOrEqual(1.2);
    }
  });

  it.each([0, 1, 2, 3])("keeps every centre within 0.3..0.7 at index %d", (index) => {
    for (const picture of [LANDSCAPE, PORTRAIT]) {
      const { from, to } = autoKenBurns(index, picture);

      for (const framing of [from, to]) {
        expect(framing.centerX).toBeGreaterThanOrEqual(0.3);
        expect(framing.centerX).toBeLessThanOrEqual(0.7);
        expect(framing.centerY).toBeGreaterThanOrEqual(0.3);
        expect(framing.centerY).toBeLessThanOrEqual(0.7);
      }
    }
  });

  it("pans in a direction that differs between consecutive slides", () => {
    const first = autoKenBurns(4, LANDSCAPE);
    const second = autoKenBurns(5, LANDSCAPE);

    const firstDirection = Math.sign(first.to.centerX - first.from.centerX);
    const secondDirection = Math.sign(second.to.centerX - second.from.centerX);
    expect(firstDirection).not.toBe(0);
    expect(firstDirection).toBe(-secondDirection);
  });

  it("aims a portrait picture's centre above the geometric middle", () => {
    const { from, to } = autoKenBurns(0, PORTRAIT);

    expect(from.centerY).toBeLessThan(0.5);
    expect(from.centerY).toBeGreaterThanOrEqual(0.35);
    expect(from.centerY).toBeLessThanOrEqual(0.45);
    expect(to.centerY).toBe(from.centerY);
  });

  it("keeps a landscape picture's centre near the middle", () => {
    const { from } = autoKenBurns(0, LANDSCAPE);

    expect(from.centerY).toBe(0.5);
  });

  describe("with a focus", () => {
    const FACE_TOP_RIGHT = { x: 0.7, y: 0.1, width: 0.1, height: 0.2 };
    const subject = (box: typeof FACE_TOP_RIGHT) => ({
      kind: "subject" as const,
      box,
      foundBy: "face" as const,
    });

    it("swings the pan around the focus centre instead of the picture's middle", () => {
      const { from, to } = autoKenBurns(0, LANDSCAPE, subject(FACE_TOP_RIGHT));

      expect((from.centerX + to.centerX) / 2).toBeCloseTo(0.75);
      expect(from.centerY).toBeCloseTo(0.2);
      expect(to.centerY).toBeCloseTo(0.2);
    });

    it("aims a portrait picture at its focus, not at where faces usually sit", () => {
      const { from } = autoKenBurns(
        0,
        PORTRAIT,
        subject({ x: 0.4, y: 0.6, width: 0.2, height: 0.2 }),
      );

      expect(from.centerY).toBeCloseTo(0.7);
    });

    it("keeps the zoom and its alternation", () => {
      const plain = autoKenBurns(1, LANDSCAPE);
      const focused = autoKenBurns(1, LANDSCAPE, subject(FACE_TOP_RIGHT));

      expect([focused.from.zoom, focused.to.zoom]).toEqual([plain.from.zoom, plain.to.zoom]);
    });

    it("keeps the pan inside the picture for a focus at its edge", () => {
      const { from, to } = autoKenBurns(
        0,
        LANDSCAPE,
        subject({ x: 0.95, y: 0, width: 0.05, height: 0.05 }),
      );

      expect(to.centerX).toBeGreaterThan(from.centerX);
      for (const framing of [from, to]) {
        expect(framing.centerX).toBeLessThanOrEqual(1);
        expect(framing.centerY).toBeGreaterThanOrEqual(0);
      }
    });

    describe("framing a group", () => {
      const GROUP_FITS_AT_FULL_ZOOM = { x: 0.35, y: 0.3, width: 0.3, height: 0.2 };
      const GROUP_NEEDS_LESS_ZOOM = { x: 0.1, y: 0.3, width: 0.78, height: 0.2 };
      const GROUP_ACROSS_THE_PICTURE = { x: 0, y: 0.3, width: 1, height: 0.2 };
      const GROUP_AT_THE_EDGE = { x: 0.2, y: 0.3, width: 0.8, height: 0.2 };

      /** The crop on a screen of the picture's own shape, where the window is 1/zoom of it. */
      const cropsAround = (box: typeof GROUP_FITS_AT_FULL_ZOOM, index: number) => {
        const { from, to } = autoKenBurns(index, LANDSCAPE, subject(box));
        return [from, to].map((framing) => cropRect(framing, LANDSCAPE, LANDSCAPE));
      };

      it.each([0, 1])(
        "keeps the full zoom for a group that fits the window at index %d",
        (index) => {
          const { from, to } = autoKenBurns(index, LANDSCAPE, subject(GROUP_FITS_AT_FULL_ZOOM));

          expect(Math.max(from.zoom, to.zoom)).toBe(1.2);
        },
      );

      it.each([0, 1])(
        "zooms less than that for a group wider than the window at index %d",
        (index) => {
          const { from, to } = autoKenBurns(index, LANDSCAPE, subject(GROUP_NEEDS_LESS_ZOOM));

          expect(Math.max(from.zoom, to.zoom)).toBeLessThan(1.2);
          expect(Math.min(from.zoom, to.zoom)).toBe(MIN_KEN_BURNS_ZOOM);
        },
      );

      it.each([
        ["a group wider than the full-zoom window", GROUP_NEEDS_LESS_ZOOM],
        ["a group at the picture's edge", GROUP_AT_THE_EDGE],
        ["a group that fits", GROUP_FITS_AT_FULL_ZOOM],
      ])("shows all of %s at both ends of the motion", (_name, box) => {
        for (const index of [0, 1, 2, 3]) {
          for (const crop of cropsAround(box, index)) {
            expect(crop.x).toBeLessThanOrEqual(box.x);
            expect(crop.x + crop.width).toBeGreaterThanOrEqual(box.x + box.width);
            expect(crop.y).toBeLessThanOrEqual(box.y);
            expect(crop.y + crop.height).toBeGreaterThanOrEqual(box.y + box.height);
          }
        }
      });

      it("still zooms a little for a group across the whole picture", () => {
        const { from, to } = autoKenBurns(0, LANDSCAPE, subject(GROUP_ACROSS_THE_PICTURE));

        expect([from.zoom, to.zoom]).toEqual([MIN_KEN_BURNS_ZOOM, SMALLEST_ZOOM_TRAVEL]);
      });

      it("zooms a little for a subject that fills the picture on a portrait one, too", () => {
        const whole = { x: 0, y: 0, width: 1, height: 1 };
        const { from, to } = autoKenBurns(1, PORTRAIT, subject(whole));

        expect([from.zoom, to.zoom]).toEqual([SMALLEST_ZOOM_TRAVEL, MIN_KEN_BURNS_ZOOM]);
      });

      it("centres the motion on the group, not on one face of it", () => {
        const { from, to } = autoKenBurns(0, LANDSCAPE, subject(GROUP_FITS_AT_FULL_ZOOM));

        expect((from.centerX + to.centerX) / 2).toBeCloseTo(0.5);
        expect(from.centerY).toBeCloseTo(0.4);
      });

      it("still pans when the group leaves room beside it", () => {
        const { from, to } = autoKenBurns(0, LANDSCAPE, subject(GROUP_FITS_AT_FULL_ZOOM));

        expect(to.centerX).toBeGreaterThan(from.centerX);
      });
    });

    it("moves as without one when the detection found nothing", () => {
      expect(autoKenBurns(2, PORTRAIT, { kind: "none" })).toEqual(autoKenBurns(2, PORTRAIT));
    });
  });

  describe("for scenery (ADR-0037)", () => {
    const scenery = { kind: "scenery" } as const;

    it.each([
      [0, "left to right"],
      [1, "right to left"],
    ])("sweeps the whole width at index %d, %s", (index) => {
      const { from, to } = autoKenBurns(index, LANDSCAPE, scenery);
      const halfFrame = 0.5 / from.zoom;

      expect(Math.min(from.centerX, to.centerX)).toBeCloseTo(halfFrame);
      expect(Math.max(from.centerX, to.centerX)).toBeCloseTo(1 - halfFrame);
      expect(from.centerX < to.centerX).toBe(index % 2 === 0);
    });

    it("keeps its zoom steady and the frame inside the picture", () => {
      const { from, to } = autoKenBurns(0, LANDSCAPE, scenery);

      expect(from.zoom).toBe(to.zoom);
      expect(from.zoom).toBeGreaterThan(MIN_KEN_BURNS_ZOOM);
      expect(from.centerX).toBeGreaterThanOrEqual(0.5 / from.zoom);
    });

    it("does not sweep sideways in a composed pair's half", () => {
      const { from, to } = autoKenBurns(0, LANDSCAPE, scenery, false);

      expect(from.centerX).toBe(to.centerX);
    });
  });

  it("uses linear easing", () => {
    expect(autoKenBurns(0, LANDSCAPE).easing).toBe("linear");
  });

  describe("without a horizontal pan, for a composed pair (ADR-0028)", () => {
    it("keeps the centre's x the same from start to end", () => {
      const { from, to } = autoKenBurns(0, LANDSCAPE, undefined, false);

      expect(from.centerX).toBe(to.centerX);
    });

    it("still zooms, in the direction the index picks", () => {
      const { from, to } = autoKenBurns(0, LANDSCAPE, undefined, false);

      expect(from.zoom).toBeLessThan(to.zoom);
    });
  });
});
