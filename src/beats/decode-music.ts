import type { DecodeMusic } from "./worker-beat-detector";

/** The rate the beats are found at (ADR-0021): enough for drums, quick to analyse. */
export const DETECTION_SAMPLE_RATE = 11_025;

/** Decodes with Web Audio, resampled to `DETECTION_SAMPLE_RATE`, its channels mixed to mono. */
export const decodeMusicWithWebAudio: DecodeMusic = async (music) => {
  const context = new OfflineAudioContext(1, 1, DETECTION_SAMPLE_RATE);
  const buffer = await context.decodeAudioData(await music.arrayBuffer());
  const samples = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] =
        (samples[index] as number) + (data[index] as number) / buffer.numberOfChannels;
    }
  }
  return { samples, sampleRate: DETECTION_SAMPLE_RATE };
};
