import {
  createFramePlayer,
  performanceClock,
  type FramePlayer,
  type OpenPicture,
  type Slideshow,
} from "../../player";
import { audioEncoderConfig, videoEncoderConfig, type AudioCodecChoice } from "../capabilities";
import { exportVideo, type ExportOutcome, type ExportProgress } from "../export-video";
import { frameCount, packetCountBounds, presetById, type PresetId } from "../plan";
import { WebCodecsAudioEncoder, WebCodecsVideoEncoder } from "./encoders";
import type { ExportTarget } from "./file-targets";
import { CanvasFrameSource } from "./frame-source";
import { createMp4Muxer, type Mp4Muxer } from "./mp4-muxer";
import { MusicRenderer } from "./music-renderer";

export interface RunVideoExportOptions {
  /** As composed for the player: `image.src` is what `openPicture` reads. */
  readonly slideshow: Slideshow;
  readonly openPicture: OpenPicture;
  /** The music's file; required exactly when `slideshow.music` is set. */
  readonly musicFile: Blob | null;
  readonly preset: PresetId;
  /** From `probeVideoExport`; null exactly when there is no music. */
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

/** Renders the slideshow into `target` as an MP4 (VIDEO_EXPORT.md). */
export async function runVideoExport(options: RunVideoExportOptions): Promise<VideoExportResult> {
  const { slideshow, target, signal } = options;
  const preset = presetById(options.preset);
  if ((slideshow.music === undefined) !== (options.musicFile === null)) {
    throw new Error("runVideoExport needs musicFile exactly when slideshow.music is set");
  }
  if ((options.musicFile === null) !== (options.audioCodec === null)) {
    throw new Error("runVideoExport needs an audioCodec exactly when there is music");
  }
  const framePlayer = createFramePlayer(slideshow, preset.size, options.openPicture);
  if (framePlayer === null) {
    return { kind: "failed", error: new Error("this browser has no WebGL2 to draw the video") };
  }
  // The timeline lays the slides end to end, so this is the player's duration in whole ms.
  const durationMs = slideshow.slides.reduce((total, slide) => total + slide.durationMs, 0);
  try {
    const job = await prepare(options, framePlayer, durationMs);
    if (job.kind !== "ready") {
      return job;
    }
    const outcome = await exportVideo({
      durationMs,
      frames: new CanvasFrameSource(framePlayer),
      videoEncoder: new WebCodecsVideoEncoder(videoEncoderConfig(preset), job.muxer.addVideo),
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
  }
}

type Prepared =
  | {
      readonly kind: "ready";
      readonly muxer: Mp4Muxer;
      readonly audio: {
        readonly source: MusicRenderer;
        readonly encoder: WebCodecsAudioEncoder;
      } | null;
    }
  | Extract<ExportOutcome, { readonly kind: "failed" | "cancelled" }>;

/**
 * Decodes the music, loads the caption font and starts the file. A failure here leaves no file
 * behind either.
 */
async function prepare(
  { slideshow, musicFile, audioCodec, target, signal }: RunVideoExportOptions,
  framePlayer: FramePlayer,
  durationMs: number,
): Promise<Prepared> {
  let writable: WritableStream | null = null;
  let muxer: Mp4Muxer | null = null;
  try {
    const envelope = slideshow.music;
    const [music] = await Promise.all([
      envelope === undefined || musicFile === null
        ? null
        : musicFile.arrayBuffer().then((bytes) => MusicRenderer.decode(bytes, envelope)),
      framePlayer.captionFontLoaded,
    ]);
    signal.throwIfAborted();
    writable = await target.open();
    muxer = await createMp4Muxer({
      writable,
      audioCodec,
      maxPackets: packetCountBounds(frameCount(durationMs)),
    });
    const audio =
      music === null || audioCodec === null || muxer.addAudio === null
        ? null
        : {
            source: music,
            encoder: new WebCodecsAudioEncoder(audioEncoderConfig(audioCodec), muxer.addAudio),
          };
    return { kind: "ready", muxer, audio };
  } catch (error: unknown) {
    if (muxer !== null) {
      await muxer.port.cancel();
    } else if (writable !== null) {
      await writable.abort(error);
    }
    await target.discard();
    return signal.aborted
      ? { kind: "cancelled" }
      : { kind: "failed", error: error instanceof Error ? error : new Error(String(error)) };
  }
}
