import { shareByWeightMs } from "../share-by-weight";
import type { PlaylistEnergy } from "./playlist-energy";
import { spansOf, type SlideSpan } from "./slide-spans";

/** Fixed number of re-weighting passes (ADR-0046, "Pacing"). */
export const ENERGY_PASSES = 3;
/** How strongly a quiet or loud span stretches or compresses an automatic slide's weight. */
export const ENERGY_SPREAD = 1.5;

/**
 * The usual durations, re-weighted by the playlist's energy (ADR-0046, "Pacing"): `ENERGY_PASSES`
 * passes, each weighting every automatic slide by `usual × ENERGY_SPREAD ^ (1 − 2·meanEnergy)` of
 * its span in the previous pass, then re-sharing the automatic slides' combined usual length by
 * those weights, in whole ms. Own durations, and their place in the timeline, never change. If
 * any pass would share less than `minSlideMs` onto a slide, the usual durations are kept instead,
 * unweighted.
 */
export function paceByEnergy(
  usualMs: readonly number[],
  automatic: readonly boolean[],
  energy: PlaylistEnergy,
  minSlideMs: number,
): number[] {
  const automaticTotalMs = usualMs.reduce(
    (sum, durationMs, index) => sum + (automatic[index] ? durationMs : 0),
    0,
  );
  let spans: readonly number[] = usualMs;
  for (let pass = 0; pass < ENERGY_PASSES; pass += 1) {
    const boundaries = spansOf(spans);
    const automaticWeights = usualMs
      .map((usual, index) => ({ usual, index }))
      .filter(({ index }) => automatic[index])
      .map(({ usual, index }) => weightOf(usual, boundaries[index] as SlideSpan, energy));
    const shares = shareByWeightMs(automaticWeights, automaticTotalMs);
    if (shares.some((share) => share < minSlideMs)) {
      return [...usualMs];
    }
    let nextShare = 0;
    spans = usualMs.map((usual, index) => (automatic[index] ? (shares[nextShare++] as number) : usual));
  }
  return [...spans];
}

function weightOf(usualMs: number, span: SlideSpan, energy: PlaylistEnergy): number {
  return usualMs * ENERGY_SPREAD ** (1 - 2 * energy.meanEnergy(span.startMs, span.endMs));
}
