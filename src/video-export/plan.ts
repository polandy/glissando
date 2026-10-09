import { MILLISECONDS_PER_SECOND, type Size } from "../player";

/** What a video export writes, frame by frame, and how big it gets. See VIDEO_EXPORT.md. */

export const FRAMES_PER_SECOND = 30;
export const KEYFRAME_INTERVAL_FRAMES = 60;
export const MICROSECONDS_PER_SECOND = 1_000_000;

export const AUDIO_SAMPLE_RATE = 48_000;
export const AUDIO_CHANNELS = 2;
export const AUDIO_BITRATE = 160_000;
export const AUDIO_SEGMENT_SECONDS = 30;
/** Shorter than any AAC or Opus packet, so it bounds their count from above. */
const AUDIO_PACKET_MIN_MS = 10;
/** Room for an encoder's priming and trailing packets. */
const AUDIO_PACKET_SLACK = 16;

export const PRESET_IDS = ["720p", "1080p", "4k"] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export const DEFAULT_PRESET_ID: PresetId = "1080p";

export interface VideoPreset {
  readonly id: PresetId;
  readonly size: Size;
  /** The WebCodecs codec string: H.264 High at a level that fits the size. */
  readonly codec: string;
  /** Bits per second. */
  readonly bitrate: number;
  /** In the suggested file name, "<title> (1080p).mp4". */
  readonly fileNameLabel: string;
}

const H264_HIGH_LEVEL_4 = "avc1.640028";
const H264_HIGH_LEVEL_5_1 = "avc1.640033";

export const VIDEO_PRESETS: readonly VideoPreset[] = [
  {
    id: "720p",
    size: { width: 1280, height: 720 },
    codec: H264_HIGH_LEVEL_4,
    bitrate: 4_000_000,
    fileNameLabel: "720p",
  },
  {
    id: "1080p",
    size: { width: 1920, height: 1080 },
    codec: H264_HIGH_LEVEL_4,
    bitrate: 8_000_000,
    fileNameLabel: "1080p",
  },
  {
    id: "4k",
    size: { width: 3840, height: 2160 },
    codec: H264_HIGH_LEVEL_5_1,
    bitrate: 24_000_000,
    fileNameLabel: "4K",
  },
];

export function presetById(id: PresetId): VideoPreset {
  const preset = VIDEO_PRESETS.find((candidate) => candidate.id === id);
  if (preset === undefined) {
    throw new RangeError(`no video preset "${id}"; use one of ${PRESET_IDS.join(", ")}`);
  }
  return preset;
}

/** Every frame of the slideshow, the last one partial. */
export function frameCount(durationMs: number): number {
  return Math.ceil((durationMs * FRAMES_PER_SECOND) / MILLISECONDS_PER_SECOND);
}

/** The slideshow time frame `index` shows. */
export function frameTimeSeconds(index: number, durationMs: number): number {
  return Math.min(index / FRAMES_PER_SECOND, durationMs / MILLISECONDS_PER_SECOND);
}

export function frameTimestampUs(index: number): number {
  return Math.round((index * MICROSECONDS_PER_SECOND) / FRAMES_PER_SECOND);
}

export function frameDurationUs(index: number): number {
  return frameTimestampUs(index + 1) - frameTimestampUs(index);
}

export function isKeyFrame(index: number): boolean {
  return index % KEYFRAME_INTERVAL_FRAMES === 0;
}

/** Bytes, from the bitrates; rough, since the encoder only aims at them. */
export function estimatedBytes(
  preset: VideoPreset,
  durationMs: number,
  withAudio: boolean,
): number {
  const bitsPerSecond = preset.bitrate + (withAudio ? AUDIO_BITRATE : 0);
  return (bitsPerSecond * durationMs) / MILLISECONDS_PER_SECOND / BITS_PER_BYTE;
}

const BITS_PER_BYTE = 8;

export interface AudioSegment {
  readonly startSample: number;
  readonly sampleCount: number;
  readonly timestampUs: number;
}

/** The audio track, exactly as long as `frames` frames, in segments rendered one at a time. */
export function audioSegments(frames: number): readonly AudioSegment[] {
  const totalSamples = (frames * AUDIO_SAMPLE_RATE) / FRAMES_PER_SECOND;
  const samplesPerSegment = AUDIO_SEGMENT_SECONDS * AUDIO_SAMPLE_RATE;
  const segments: AudioSegment[] = [];
  for (let startSample = 0; startSample < totalSamples; startSample += samplesPerSegment) {
    segments.push({
      startSample,
      sampleCount: Math.min(samplesPerSegment, totalSamples - startSample),
      timestampUs: (startSample / AUDIO_SAMPLE_RATE) * MICROSECONDS_PER_SECOND,
    });
  }
  return segments;
}

/** Upper bounds on each track's packets, for the space reserved for the MP4's index up front. */
export function packetCountBounds(frames: number): {
  readonly video: number;
  readonly audio: number;
} {
  const durationMs = (frames * MILLISECONDS_PER_SECOND) / FRAMES_PER_SECOND;
  return {
    video: frames,
    audio: Math.ceil(durationMs / AUDIO_PACKET_MIN_MS) + AUDIO_PACKET_SLACK,
  };
}
