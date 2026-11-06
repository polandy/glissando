import { FINE_PEAK_COUNT } from "./waveform-peaks";

/**
 * A song's loudness hops as `FINE_PEAK_COUNT` fine peaks, spread over the hops, not the song's
 * duration: slice s takes the loudest hop it overlaps at all, so a song of fewer hops than slices
 * repeats its values instead of leaving gaps. A song without hops is all zeros, drawn flat. The
 * values stay absolute; the waveform scales them.
 */
export function finePeaksFromHops(hopPeaks: Float32Array): Float32Array {
  const hopCount = hopPeaks.length;
  return Float32Array.from({ length: FINE_PEAK_COUNT }, (_, slice) => {
    const from = Math.floor((slice * hopCount) / FINE_PEAK_COUNT);
    const to = Math.min(
      hopCount,
      Math.max(from + 1, Math.ceil(((slice + 1) * hopCount) / FINE_PEAK_COUNT)),
    );
    let peak = 0;
    for (let hop = from; hop < to; hop += 1) {
      peak = Math.max(peak, hopPeaks[hop] ?? 0);
    }
    return peak;
  });
}
