/**
 * The waveform's bar heights: the loudest sample in each of `bars` even slices of the track,
 * scaled so the loudest bar is 1. Silence stays flat.
 */
export function waveformPeaks(samples: Float32Array, bars: number): number[] {
  const peaks = Array.from({ length: bars }, (_, bar) => {
    const from = Math.floor((bar * samples.length) / bars);
    const to = Math.floor(((bar + 1) * samples.length) / bars);
    let peak = 0;
    for (let index = from; index < to; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index] ?? 0));
    }
    return peak;
  });
  const loudest = Math.max(0, ...peaks);
  return loudest === 0 ? peaks : peaks.map((peak) => peak / loudest);
}
