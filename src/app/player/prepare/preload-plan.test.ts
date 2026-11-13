import { describe, expect, it } from "vitest";
import { planPreload, type PreloadPlan } from "./preload-plan";

/** Where `count` slides of `seconds` each start. */
function evenStarts(count: number, seconds: number): number[] {
  return Array.from({ length: count }, (_, index) => index * seconds);
}

describe("planPreload", () => {
  it("waits for the slow pictures of an even slideshow by the safety-padded shortfall", () => {
    // 6 s a picture, 5 s a slide, 30 slides: 6 + 29 · (6 − 5) · 1.2 = 40.8 s.
    const plan = planPreload(6, evenStarts(30, 5));

    expect(plan.startDelaySeconds).toBeCloseTo(40.8);
    expect(plan.preloadCount).toBe(7);
  });

  it("starts after the first picture when a picture is ready faster than it is shown", () => {
    expect(planPreload(1, evenStarts(30, 5))).toEqual<PreloadPlan>({
      startDelaySeconds: 1,
      preloadCount: 1,
    });
  });

  it("starts after the first picture when a picture takes exactly as long as a slide", () => {
    expect(planPreload(5, evenStarts(30, 5)).preloadCount).toBe(1);
  });

  it("waits for a run of short slides the average slide length would hide", () => {
    // 4 s a picture; slides of 2, 8 and 2 s average 4 s, but the second starts after only 2 s:
    // 4 + (4 − 2) · 1.2 = 6.4 s.
    const plan = planPreload(4, [0, 2, 10, 12]);

    expect(plan.startDelaySeconds).toBeCloseTo(6.4);
    expect(plan.preloadCount).toBe(2);
  });

  it("preloads more once a picture takes longer", () => {
    const starts = evenStarts(30, 5);

    expect(planPreload(8, starts).preloadCount).toBeGreaterThan(
      planPreload(6, starts).preloadCount,
    );
    expect(planPreload(8, starts).preloadCount).toBe(15);
  });

  it("never preloads more pictures than the slideshow has", () => {
    // 10 + (2 · 10 − 1) · 1.2 = 32.8 s, four pictures' worth, of three.
    expect(planPreload(10, [0, 0.5, 1]).preloadCount).toBe(3);
  });

  it("starts after the first picture when pictures are ready at once", () => {
    expect(planPreload(0, evenStarts(30, 5))).toEqual<PreloadPlan>({
      startDelaySeconds: 0,
      preloadCount: 1,
    });
  });

  it("preloads nothing for a slideshow without slides", () => {
    expect(planPreload(3, []).preloadCount).toBe(0);
  });

  it("plans from the start slide: the slides before it are not needed", () => {
    // 6 s a picture, 5 s a slide, from slide 20 of 30: ten slides left, as a show of ten.
    expect(planPreload(6, evenStarts(30, 5), 20)).toEqual(planPreload(6, evenStarts(10, 5)));
  });

  it("keeps the start slide's own length: a long first slide gives preparing a head start", () => {
    // 4 s a picture; from slide 1 the slides last 8 and 2 s: the second starts after 8 s.
    expect(planPreload(4, [0, 8, 16, 18], 1)).toEqual(planPreload(4, [0, 8, 10]));
  });

  it("preloads nothing when the start slide is past the last", () => {
    expect(planPreload(3, evenStarts(4, 5), 4).preloadCount).toBe(0);
  });

  describe("pictures prepared a few at a time", () => {
    it("plans one at a time unless told otherwise", () => {
      expect(planPreload(6, evenStarts(30, 5), 0, 1)).toEqual(planPreload(6, evenStarts(30, 5)));
    });

    it("waits for the first round only when two at a time keep up with the slides", () => {
      // 6 s a picture, two at a time, 5 s a slide: picture i is ready after (⌊i/2⌋ + 1) · 6 s,
      // never after its slide starts, so the first two pictures are enough.
      expect(planPreload(6, evenStarts(30, 5), 0, 2)).toEqual<PreloadPlan>({
        startDelaySeconds: 6,
        preloadCount: 2,
      });
    });

    it("waits for whole rounds by the safety-padded shortfall of two at a time", () => {
      // 12 s a picture, two at a time, 5 s a slide, 30 slides: the shortfall peaks at picture 28,
      // ⌊28/2⌋ · 12 − 28 · 5 = 28 s: 12 + 28 · 1.2 = 45.6 s, four rounds of two.
      const plan = planPreload(12, evenStarts(30, 5), 0, 2);

      expect(plan.startDelaySeconds).toBeCloseTo(45.6);
      expect(plan.preloadCount).toBe(8);
    });

    it("never preloads more pictures than the slideshow has, even in whole rounds", () => {
      expect(planPreload(10, [0, 0.5, 1], 0, 2).preloadCount).toBe(3);
    });
  });
});
