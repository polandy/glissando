import {
  AUDIO_BITRATE,
  AUDIO_CHANNELS,
  AUDIO_SAMPLE_RATE,
  DEFAULT_PRESET_ID,
  FRAMES_PER_SECOND,
  VIDEO_PRESETS,
  type PresetId,
  type VideoPreset,
} from "./plan";

/** Preferred first: AAC plays everywhere, Opus not on Apple devices (ADR-0015). */
export const AUDIO_CODECS = { aac: "mp4a.40.2", opus: "opus" } as const;
export type AudioCodecChoice = keyof typeof AUDIO_CODECS;
const AUDIO_CODEC_PREFERENCE: readonly AudioCodecChoice[] = ["aac", "opus"];

/** What the browser can do, asked of it directly, never of its user-agent string. */
export interface CapabilityProbe {
  readonly hasVideoEncoder: boolean;
  readonly hasWebGl2: boolean;
  isVideoConfigSupported(config: VideoEncoderConfig): Promise<boolean>;
  isAudioConfigSupported(config: AudioEncoderConfig): Promise<boolean>;
}

export type UnsupportedReason = "no-video-encoder" | "no-webgl2" | "no-preset" | "no-audio-codec";

export type ExportCapabilities =
  | { readonly supported: false; readonly reason: UnsupportedReason }
  | {
      readonly supported: true;
      /** In the order of `VIDEO_PRESETS`; the others are greyed out. */
      readonly available: readonly PresetId[];
      readonly defaultPreset: PresetId;
      /** Null for a slideshow without music, which gets no audio track. */
      readonly audioCodec: AudioCodecChoice | null;
    };

export function videoEncoderConfig(preset: VideoPreset): VideoEncoderConfig {
  return {
    codec: preset.codec,
    width: preset.size.width,
    height: preset.size.height,
    bitrate: preset.bitrate,
    framerate: FRAMES_PER_SECOND,
    hardwareAcceleration: "no-preference",
    // MP4 carries the parameter sets in its header, not in the stream.
    avc: { format: "avc" },
  };
}

export function audioEncoderConfig(codec: AudioCodecChoice): AudioEncoderConfig {
  return {
    codec: AUDIO_CODECS[codec],
    sampleRate: AUDIO_SAMPLE_RATE,
    numberOfChannels: AUDIO_CHANNELS,
    bitrate: AUDIO_BITRATE,
  };
}

export async function probeCapabilities(
  probe: CapabilityProbe,
  { withMusic }: { readonly withMusic: boolean },
): Promise<ExportCapabilities> {
  if (!probe.hasVideoEncoder) {
    return { supported: false, reason: "no-video-encoder" };
  }
  if (!probe.hasWebGl2) {
    return { supported: false, reason: "no-webgl2" };
  }
  const available: PresetId[] = [];
  for (const preset of VIDEO_PRESETS) {
    if (await probe.isVideoConfigSupported(videoEncoderConfig(preset))) {
      available.push(preset.id);
    }
  }
  const largest = available.at(-1);
  if (largest === undefined) {
    return { supported: false, reason: "no-preset" };
  }
  const audioCodec = withMusic ? await firstAudioCodec(probe) : null;
  if (withMusic && audioCodec === null) {
    return { supported: false, reason: "no-audio-codec" };
  }
  return {
    supported: true,
    available,
    defaultPreset: available.includes(DEFAULT_PRESET_ID) ? DEFAULT_PRESET_ID : largest,
    audioCodec,
  };
}

async function firstAudioCodec(probe: CapabilityProbe): Promise<AudioCodecChoice | null> {
  for (const codec of AUDIO_CODEC_PREFERENCE) {
    if (await probe.isAudioConfigSupported(audioEncoderConfig(codec))) {
      return codec;
    }
  }
  return null;
}
