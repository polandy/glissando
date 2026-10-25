/** How many points the energy curve's area is sampled at, decorative so a coarse curve is fine. */
export const STRIP_SAMPLE_COUNT = 48;

/** A point of the energy curve's area, both axes a fraction 0..1 of the strip. */
export interface StripPoint {
  readonly x: number;
  readonly y: number;
}

/** The stretch the preview plays, as fractions 0..1 of the whole strip's width. */
export interface StripStretch {
  readonly startFraction: number;
  readonly endFraction: number;
}

/** What `EnergyStrip.svelte` draws (ADR-0046): decorative, so every position is a 0..1 fraction. */
export interface EnergyStripGeometry {
  readonly areaPoints: readonly StripPoint[];
  readonly tickFractions: readonly number[];
  readonly liftFractions: readonly number[];
  readonly previewStretch: StripStretch;
}

/**
 * Lays the whole slideshow's energy curve out as fractions of the strip's width: `energyAt` is
 * sampled `STRIP_SAMPLE_COUNT + 1` times evenly across `[0, totalMs]`; `tickMs` (every picture
 * change) and `liftsMs` become fractions the same way. `totalMs` of `0` (no music to pace by)
 * gives an empty, safe geometry rather than dividing by it.
 */
export function energyStripGeometry(input: {
  readonly totalMs: number;
  readonly energyAt: (ms: number) => number;
  readonly tickMs: readonly number[];
  readonly liftsMs: readonly number[];
  readonly previewStartMs: number;
  readonly previewEndMs: number;
}): EnergyStripGeometry {
  const { totalMs, energyAt, tickMs, liftsMs, previewStartMs, previewEndMs } = input;
  if (totalMs <= 0) {
    return {
      areaPoints: [],
      tickFractions: [],
      liftFractions: [],
      previewStretch: { startFraction: 0, endFraction: 0 },
    };
  }
  const fractionOf = (ms: number) => ms / totalMs;
  const areaPoints = Array.from({ length: STRIP_SAMPLE_COUNT + 1 }, (_unused, index) => {
    const ms = (totalMs * index) / STRIP_SAMPLE_COUNT;
    return { x: fractionOf(ms), y: energyAt(ms) };
  });
  return {
    areaPoints,
    tickFractions: tickMs.map(fractionOf),
    liftFractions: liftsMs.map(fractionOf),
    previewStretch: {
      startFraction: fractionOf(previewStartMs),
      endFraction: fractionOf(previewEndMs),
    },
  };
}
