import { describe, expect, it } from "vitest";
import { autoKenBurns } from "./auto-ken-burns";
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
    const subject = (box: typeof FACE_TOP_RIGHT) => ({ kind: "subject" as const, box });

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

    it("moves as without one when the detection found nothing", () => {
      expect(autoKenBurns(2, PORTRAIT, { kind: "none" })).toEqual(autoKenBurns(2, PORTRAIT));
    });
  });

  it("uses linear easing", () => {
    expect(autoKenBurns(0, LANDSCAPE).easing).toBe("linear");
  });
});
