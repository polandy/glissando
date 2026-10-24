import { describe, expect, it } from "vitest";
import { energyStripGeometry, STRIP_SAMPLE_COUNT } from "./energy-strip-geometry";

describe("energyStripGeometry", () => {
  it("samples the energy curve evenly across the whole width, 0 to 1", () => {
    const geometry = energyStripGeometry({
      totalMs: 10_000,
      energyAt: () => 0.5,
      tickMs: [],
      liftsMs: [],
      previewStartMs: 0,
      previewEndMs: 1000,
    });

    expect(geometry.areaPoints).toHaveLength(STRIP_SAMPLE_COUNT + 1);
    expect(geometry.areaPoints[0]).toEqual({ x: 0, y: 0.5 });
    expect(geometry.areaPoints.at(-1)).toEqual({ x: 1, y: 0.5 });
  });

  it("reads each sample's energy at its own point in time", () => {
    const geometry = energyStripGeometry({
      totalMs: 10_000,
      energyAt: (ms) => (ms < 5000 ? 0 : 1),
      tickMs: [],
      liftsMs: [],
      previewStartMs: 0,
      previewEndMs: 1000,
    });

    expect(geometry.areaPoints[0]?.y).toBe(0);
    expect(geometry.areaPoints.at(-1)?.y).toBe(1);
  });

  it("places a tick at each picture change, as a fraction of the whole width", () => {
    const geometry = energyStripGeometry({
      totalMs: 10_000,
      energyAt: () => 0.5,
      tickMs: [2000, 5000],
      liftsMs: [],
      previewStartMs: 0,
      previewEndMs: 1000,
    });

    expect(geometry.tickFractions).toEqual([0.2, 0.5]);
  });

  it("places a dashed line at each lift, as a fraction of the whole width", () => {
    const geometry = energyStripGeometry({
      totalMs: 10_000,
      energyAt: () => 0.5,
      tickMs: [],
      liftsMs: [3000],
      previewStartMs: 0,
      previewEndMs: 1000,
    });

    expect(geometry.liftFractions).toEqual([0.3]);
  });

  it("shades the stretch the preview plays, as fractions of the whole width", () => {
    const geometry = energyStripGeometry({
      totalMs: 10_000,
      energyAt: () => 0.5,
      tickMs: [],
      liftsMs: [],
      previewStartMs: 4000,
      previewEndMs: 6000,
    });

    expect(geometry.previewStretch).toEqual({ startFraction: 0.4, endFraction: 0.6 });
  });

  it("gives an empty, safe geometry for a playlist with no length", () => {
    const geometry = energyStripGeometry({
      totalMs: 0,
      energyAt: () => 0.5,
      tickMs: [1000],
      liftsMs: [1000],
      previewStartMs: 0,
      previewEndMs: 0,
    });

    expect(geometry).toEqual({
      areaPoints: [],
      tickFractions: [],
      liftFractions: [],
      previewStretch: { startFraction: 0, endFraction: 0 },
    });
  });
});
