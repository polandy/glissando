import type { DecodeMusic } from "./worker-loudness-meter";

/**
 * Decodes with Web Audio at this device's own output rate, every channel kept apart (ADR-0040):
 * unlike the beat pass's decode, nothing is resampled down or mixed to mono, so the measured
 * peaks and loudness are not blurred by either.
 */
export const decodeMusicFullRate: DecodeMusic = async (music) => {
  const probe = new AudioContext();
  const sampleRate = probe.sampleRate;
  await probe.close();
  const context = new OfflineAudioContext(1, 1, sampleRate);
  const buffer = await context.decodeAudioData(await music.arrayBuffer());
  const channels = Array.from({ length: buffer.numberOfChannels }, (_unused, channel) =>
    buffer.getChannelData(channel),
  );
  return { channels, sampleRate: buffer.sampleRate };
};
