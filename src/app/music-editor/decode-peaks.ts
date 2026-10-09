import { waveformPeaks } from "./waveform-peaks";

/** How finely the track is sampled once; the waveform takes its bars from these. */
export const FINE_PEAK_COUNT = 1000;
/** The browser resamples to this rate while decoding; peaks need no more. */
const DECODE_SAMPLE_RATE = 8000;

/** Turns a music file into its fine peaks; the browser's decoder behind a seam. */
export type DecodePeaks = (blob: Blob) => Promise<Float32Array>;

/** Decodes with Web Audio: the loudest of the channels in each of `FINE_PEAK_COUNT` slices. */
export const decodePeaksWithWebAudio: DecodePeaks = async (blob) => {
  const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
  const buffer = await context.decodeAudioData(await blob.arrayBuffer());
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    waveformPeaks(buffer.getChannelData(channel), FINE_PEAK_COUNT),
  );
  return Float32Array.from({ length: FINE_PEAK_COUNT }, (_, slice) =>
    Math.max(0, ...channels.map((peaks) => peaks[slice] ?? 0)),
  );
};
