/**
 * ITU-R BS.1770-4 loudness measurement: one pass over the K-weighted, channel-summed energy in
 * 400 ms gating blocks (75 % overlap, a new block every 100 ms hop) and the plain sample peak of
 * each 100 ms hop. `excerptLoudnessLufs` and `excerptPeakDbfs` turn these into the numbers a
 * trimmed excerpt needs, without decoding the file again.
 */
import { applyKWeighting } from "./k-weighting";

export const LOUDNESS_BLOCK_MS = 400;
export const LOUDNESS_HOP_MS = 100;
/** A gating block spans this many hops (400 ms / 100 ms); it ties block edges to hop edges. */
const HOPS_PER_BLOCK = LOUDNESS_BLOCK_MS / LOUDNESS_HOP_MS;
const MS_PER_SECOND = 1000;

export interface MusicLoudness {
  /** K-weighted, channel-summed mean square of each 400 ms gating block; block i starts at i × 100 ms. */
  readonly blockMeanSquares: Float32Array;
  /** Absolute sample peak (linear, 0..) of each 100 ms hop; hop i covers [i×100, (i+1)×100) ms. */
  readonly hopPeaks: Float32Array;
}

export function measureLoudness(
  channels: readonly Float32Array[],
  sampleRate: number,
): MusicLoudness {
  const [firstChannel] = channels;
  if (!firstChannel) {
    throw new Error("measureLoudness needs at least one channel");
  }
  const length = firstChannel.length;
  for (const channel of channels) {
    if (channel.length !== length) {
      throw new Error("measureLoudness needs every channel to hold the same number of samples");
    }
  }

  const hopSamples = Math.round((sampleRate * LOUDNESS_HOP_MS) / MS_PER_SECOND);
  const blockSamples = hopSamples * HOPS_PER_BLOCK;
  const weighted = channels.map((channel) => applyKWeighting(channel, sampleRate));

  // Cumulative K-weighted energy, summed across channels, so a block's mean square comes from
  // two lookups instead of re-summing its 400 ms on every hop.
  const cumulativeEnergy = new Float64Array(length + 1);
  for (let n = 0; n < length; n += 1) {
    let energy = 0;
    for (const channel of weighted) energy += (channel[n] as number) ** 2;
    cumulativeEnergy[n + 1] = (cumulativeEnergy[n] as number) + energy;
  }

  const hopCount = Math.floor(length / hopSamples);
  const hopPeaks = new Float32Array(hopCount);
  for (let hop = 0; hop < hopCount; hop += 1) {
    const start = hop * hopSamples;
    let peak = 0;
    for (let n = start; n < start + hopSamples; n += 1) {
      for (const channel of channels) peak = Math.max(peak, Math.abs(channel[n] as number));
    }
    hopPeaks[hop] = peak;
  }

  const blockCount = Math.max(0, hopCount - HOPS_PER_BLOCK + 1);
  const blockMeanSquares = new Float32Array(blockCount);
  for (let block = 0; block < blockCount; block += 1) {
    const start = block * hopSamples;
    const sum = (cumulativeEnergy[start + blockSamples] as number) - (cumulativeEnergy[start] as number);
    blockMeanSquares[block] = sum / blockSamples;
  }

  return { blockMeanSquares, hopPeaks };
}
