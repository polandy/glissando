import { describe, expect, it } from "vitest";
import { finePeaksFromHops } from "./hop-fine-peaks";
import { FINE_PEAK_COUNT } from "./waveform-peaks";

/** `count` hops that rise by one step each, so every hop differs from its neighbours. */
function rising(count: number): Float32Array {
  return Float32Array.from({ length: count }, (_, hop) => (hop + 1) / count);
}

describe("finePeaksFromHops", () => {
  it("keeps one hop per slice as it is when there are as many hops as slices", () => {
    const hops = rising(FINE_PEAK_COUNT);

    expect(finePeaksFromHops(hops)).toEqual(hops);
  });

  it("takes the larger of each pair of hops when there are twice as many", () => {
    const hops = Float32Array.from({ length: FINE_PEAK_COUNT * 2 }, (_, hop) =>
      hop % 2 === 0 ? 0.25 : 0.75,
    );

    expect(finePeaksFromHops(hops)).toEqual(new Float32Array(FINE_PEAK_COUNT).fill(0.75));
  });

  it("takes the pair's maximum whichever hop of the pair is the larger", () => {
    const hops = Float32Array.from({ length: FINE_PEAK_COUNT * 2 }, (_, hop) =>
      hop === 0 ? 0.9 : hop === 3 ? 0.6 : 0.1,
    );

    const fine = finePeaksFromHops(hops);

    expect([fine[0], fine[1], fine[2]]).toEqual([
      Math.fround(0.9),
      Math.fround(0.6),
      Math.fround(0.1),
    ]);
  });

  it("repeats a short song's hops, leaving no slice at zero", () => {
    const fine = finePeaksFromHops(Float32Array.from([0.2, 0.5, 0.8]));

    const third = FINE_PEAK_COUNT / 3;
    expect([fine[0], fine[Math.floor(third) - 1]]).toEqual([Math.fround(0.2), Math.fround(0.2)]);
    expect([fine[Math.ceil(third) + 1], fine[Math.floor(2 * third) - 1]]).toEqual([
      Math.fround(0.5),
      Math.fround(0.5),
    ]);
    expect(fine[FINE_PEAK_COUNT - 1]).toBe(Math.fround(0.8));
    expect(fine.filter((value) => value === 0).length).toBe(0);
  });

  it("lets a slice straddling two hops take the larger", () => {
    const hops = new Float32Array(1500);
    hops[1] = 0.4;
    hops[2] = 0.7;

    const fine = finePeaksFromHops(hops);

    // Slice 1 covers hops [1.5, 3): hops 1 and 2 overlap it, so the larger of those wins.
    expect(fine[1]).toBe(Math.fround(0.7));
    // Slice 0 covers hops [0, 1.5): hop 1 overlaps its end.
    expect(fine[0]).toBe(Math.fround(0.4));
  });

  it("draws a song without hops flat, not pending", () => {
    expect(finePeaksFromHops(new Float32Array(0))).toEqual(new Float32Array(FINE_PEAK_COUNT));
  });

  it.each([0, 1, 3, 999, 1000, 1500, 4321])(
    "always has FINE_PEAK_COUNT slices for %i hops",
    (n) => {
      expect(finePeaksFromHops(rising(n)).length).toBe(FINE_PEAK_COUNT);
    },
  );
});
