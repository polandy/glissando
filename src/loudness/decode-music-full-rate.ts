import { assertMusicWithinLimits } from "../import/music-limits";
import { probeMusicDurationMs } from "../import/music-probe";
import type { DecodeMusic } from "./worker-loudness-meter";

/** The device's output rate; asked once, since it does not change while the app runs. */
export type ProbeSampleRate = () => Promise<number>;

/** Reads a rate on first use and keeps the answer, so `probe` runs at most once. */
export function onceProbed(probe: ProbeSampleRate): ProbeSampleRate {
  let rate: Promise<number> | undefined;
  return () => (rate ??= probe());
}

/** Opens an `AudioContext` only to read its rate, which is the device's output rate. */
export const probeDeviceSampleRate: ProbeSampleRate = async () => {
  const context = new AudioContext();
  const { sampleRate } = context;
  await context.close();
  return sampleRate;
};

/**
 * Decodes with Web Audio at this device's own output rate, every channel kept apart (ADR-0040):
 * unlike the beat pass's decode, nothing is resampled down or mixed to mono, so the measured
 * peaks and loudness are not blurred by either. The rate is probed on the first song, not at
 * boot: an `AudioContext` made before a user gesture draws browser warnings. A song over
 * `MAX_MUSIC_BYTES` or `MAX_MUSIC_DURATION_MS` is refused before it is read, which bounds the
 * decoded size.
 */
export function createFullRateDecoder(probeSampleRate: ProbeSampleRate): DecodeMusic {
  const deviceSampleRate = onceProbed(probeSampleRate);
  return async (music) => {
    await assertMusicWithinLimits(music, probeMusicDurationMs);
    const context = new OfflineAudioContext(1, 1, await deviceSampleRate());
    const buffer = await context.decodeAudioData(await music.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_unused, channel) =>
      buffer.getChannelData(channel),
    );
    return { channels, sampleRate: buffer.sampleRate };
  };
}
