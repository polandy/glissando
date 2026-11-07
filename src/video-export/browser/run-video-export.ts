import {
  createFramePlayer,
  performanceClock,
  videoSoundSpans,
  type FramePlayer,
  type OpenPicture,
  type Slideshow,
} from "../../player";
import { audioEncoderConfig, videoEncoderConfig, type AudioCodecChoice } from "../capabilities";
import type { AudioEncoderPort, VideoEncoderPort } from "../ports";
import { exportVideo, type ExportOutcome, type ExportProgress } from "../export-video";
import {
  frameCount,
  packetCountBounds,
  presetById,
  type PresetId,
  type VideoPreset,
} from "../plan";
import {
  WebCodecsAudioEncoder,
  WebCodecsVideoEncoder,
  type AudioChunkOutput,
  type VideoChunkOutput,
} from "./encoders";
import type { ExportTarget } from "./file-targets";
import { CanvasFrameSource } from "./frame-source";
import { createMp4Muxer, type Mp4Muxer } from "./mp4-muxer";
import { AudioMixer, type ClipAudio, type OpenMusic } from "./audio-mixer";
import { ClipFrames, type OpenVideo } from "./clip-frames";
import { ClipSound } from "./clip-sound";
import { clipAudioSlides, exportHasAudio } from "../clip-audio-plan";

export interface RunVideoExportOptions {
  /** As composed for the player: `image.src` is what `openPicture` reads. */
  readonly slideshow: Slideshow;
  readonly openPicture: OpenPicture;
  /** Reads a song's file by a track's `src`; each distinct song is read once. */
  readonly openMusic: OpenMusic;
  /** Reads a clip's file by a video slide's `src`; needed exactly when a slide has a clip. */
  readonly openVideo?: OpenVideo;
  readonly preset: PresetId;
  /** From `probeVideoExport`; null exactly when there is no music and no clip with sound. */
  readonly audioCodec: AudioCodecChoice | null;
  readonly target: ExportTarget;
  /** Aborting stops the export at once and discards the file. */
  readonly signal: AbortSignal;
  /** After every frame; `preview` holds the frame just encoded. */
  readonly onProgress?: (progress: ExportProgress, preview: HTMLCanvasElement) => void;
}

export type VideoExportResult =
  | { readonly kind: "done"; readonly frames: number; readonly file: File }
  | Exclude<ExportOutcome, { readonly kind: "done" }>;

/** Builds the encoders; a test injects ones that fail or record. */
export interface ExportEncoders {
  video(config: VideoEncoderConfig, output: VideoChunkOutput): VideoEncoderPort<VideoFrame>;
  audio(config: AudioEncoderConfig, output: AudioChunkOutput): AudioEncoderPort<AudioData>;
}

const webCodecsEncoders: ExportEncoders = {
  video: (config, output) => new WebCodecsVideoEncoder(config, output),
  audio: (config, output) => new WebCodecsAudioEncoder(config, output),
};

/** Renders the slideshow into `target` as an MP4 (VIDEO_EXPORT.md). */
export function runVideoExport(options: RunVideoExportOptions): Promise<VideoExportResult> {
  return runVideoExportWith(webCodecsEncoders, options);
}

/** `runVideoExport` with the encoders injected. */
export async function runVideoExportWith(
  encoders: ExportEncoders,
  options: RunVideoExportOptions,
): Promise<VideoExportResult> {
  const { slideshow, target, signal } = options;
  const preset = presetById(options.preset);
  if (exportHasAudio(slideshow) !== (options.audioCodec !== null)) {
    throw new Error("runVideoExport needs an audioCodec exactly when there is audio to mix");
  }
  const { openVideo } = options;
  const hasClips = slideshow.slides.some((slide) => "video" in slide && slide.video !== undefined);
  if (hasClips && openVideo === undefined) {
    throw new Error("runVideoExport needs openVideo for a slideshow with video slides");
  }
  const framePlayer = createFramePlayer(slideshow, preset.size, {
    ...(options.openPicture === undefined ? {} : { openPicture: options.openPicture }),
    ...(openVideo === undefined
      ? {}
      : { openVideoFrames: (src: string) => new ClipFrames(src, openVideo, preset.size.width) }),
  });
  if (framePlayer === null) {
    return { kind: "failed", error: new Error("this browser has no WebGL2 to draw the video") };
  }
  const clipSounds = clipAudioSlides(slideshow.slides);
  const clipAudio: ClipAudio | null =
    openVideo === undefined || clipSounds.length === 0
      ? null
      : {
          sound: new ClipSound(clipSounds, openVideo),
          duckSpans: videoSoundSpans(slideshow.slides),
        };
  // The timeline lays the slides end to end, so this is the player's duration in whole ms.
  const durationMs = slideshow.slides.reduce((total, slide) => total + slide.durationMs, 0);
  try {
    const job = await prepare(encoders, options, clipAudio, framePlayer, durationMs, preset);
    if (job.kind !== "ready") {
      return job;
    }
    const outcome = await exportVideo({
      durationMs,
      frames: new CanvasFrameSource(framePlayer),
      videoEncoder: job.videoEncoder,
      audio: job.audio,
      muxer: job.muxer.port,
      sink: target,
      clock: performanceClock,
      signal,
      onProgress: (progress) => options.onProgress?.(progress, framePlayer.canvas),
    });
    return outcome.kind === "done" ? { ...outcome, file: await target.file() } : outcome;
  } finally {
    framePlayer.dispose();
    clipAudio?.sound.dispose();
  }
}

type Prepared =
  | {
      readonly kind: "ready";
      readonly muxer: Mp4Muxer;
      readonly videoEncoder: VideoEncoderPort<VideoFrame>;
      readonly audio: {
        readonly source: AudioMixer;
        readonly encoder: AudioEncoderPort<AudioData>;
      } | null;
    }
  | Extract<ExportOutcome, { readonly kind: "failed" | "cancelled" }>;

/**
 * Decodes the music, opens the clips' sound, loads the caption font and the show's card fonts, and starts the file. A
 * failure here leaves no file behind either.
 */
async function prepare(
  encoders: ExportEncoders,
  { slideshow, openMusic, audioCodec, target, signal }: RunVideoExportOptions,
  clipAudio: ClipAudio | null,
  framePlayer: FramePlayer,
  durationMs: number,
  preset: VideoPreset,
): Promise<Prepared> {
  let writable: WritableStream | null = null;
  let muxer: Mp4Muxer | null = null;
  let videoEncoder: VideoEncoderPort<VideoFrame> | null = null;
  let audioEncoder: AudioEncoderPort<AudioData> | null = null;
  try {
    const [music] = await Promise.all([
      audioCodec === null ? null : AudioMixer.decode(slideshow.music ?? [], openMusic, clipAudio),
      framePlayer.captionFontLoaded,
      framePlayer.cardFontsLoaded,
    ]);
    signal.throwIfAborted();
    writable = await target.open();
    muxer = await createMp4Muxer({
      writable,
      audioCodec,
      maxPackets: packetCountBounds(frameCount(durationMs)),
    });
    videoEncoder = encoders.video(videoEncoderConfig(preset), muxer.addVideo);
    if (music !== null && audioCodec !== null && muxer.addAudio !== null) {
      audioEncoder = encoders.audio(audioEncoderConfig(audioCodec), muxer.addAudio);
    }
    const audio =
      audioEncoder === null || music === null ? null : { source: music, encoder: audioEncoder };
    return { kind: "ready", muxer, videoEncoder, audio };
  } catch (error: unknown) {
    // The outcome carries the first error; a cancel that fails as well must not keep a private
    // file from being removed.
    const ignore = () => undefined;
    audioEncoder?.close();
    videoEncoder?.close();
    if (muxer !== null) {
      await muxer.port.cancel().catch(ignore);
    } else if (writable !== null) {
      await writable.abort(error).catch(ignore);
    }
    await target.discard();
    return signal.aborted
      ? { kind: "cancelled" }
      : { kind: "failed", error: error instanceof Error ? error : new Error(String(error)) };
  }
}
