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

  it("uses linear easing", () => {
    expect(autoKenBurns(0, LANDSCAPE).easing).toBe("linear");
  });
});
