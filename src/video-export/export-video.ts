import type { Clock } from "../player";
import {
  audioSegments,
  frameCount,
  frameDurationUs,
  frameTimeSeconds,
  frameTimestampUs,
  isKeyFrame,
} from "./plan";
import type {
  AudioEncoderPort,
  AudioSource,
  Closable,
  FileSink,
  FrameSource,
  MuxerPort,
  VideoEncoderPort,
} from "./ports";

/** More queued frames than this and the run waits for the encoder (VIDEO_EXPORT.md). */
const MAX_ENCODE_QUEUE = 2;
const QUOTA_EXCEEDED = "QuotaExceededError";

export interface ExportProgress {
  readonly framesDone: number;
  readonly framesTotal: number;
  /** The time per frame so far times the frames left. */
  readonly remainingMs: number;
}

export type ExportOutcome =
  | { readonly kind: "done"; readonly frames: number }
  | { readonly kind: "cancelled" }
  /** The partial file is discarded; `frameReached` frames had been encoded. */
  | { readonly kind: "storage-full"; readonly frameReached: number }
  | { readonly kind: "failed"; readonly error: Error };

export interface ExportJob<Frame extends Closable, Block extends Closable> {
  readonly durationMs: number;
  readonly frames: FrameSource<Frame>;
  readonly videoEncoder: VideoEncoderPort<Frame>;
  /** Null for a slideshow without music: the file gets no audio track. */
  readonly audio: {
    readonly source: AudioSource<Block>;
    readonly encoder: AudioEncoderPort<Block>;
  } | null;
  readonly muxer: MuxerPort;
  readonly sink: FileSink;
  readonly clock: Clock;
  readonly signal: AbortSignal;
  readonly onProgress?: (progress: ExportProgress) => void;
}

/**
 * Renders, encodes and writes the slideshow frame by frame on its own time, the music in
 * segments interleaved as the video passes their start. Never rejects for the run's own failures;
 * the outcome says how it ended, and anything but "done" leaves no file behind.
 */
export async function exportVideo<Frame extends Closable, Block extends Closable>(
  job: ExportJob<Frame, Block>,
): Promise<ExportOutcome> {
  const framesTotal = frameCount(job.durationMs);
  let framesDone = 0;
  try {
    await encodeAll(job, framesTotal, () => (framesDone += 1));
    return { kind: "done", frames: framesTotal };
  } catch (error: unknown) {
    await cleanUp(job);
    if (job.signal.aborted) {
      return { kind: "cancelled" };
    }
    if (isQuotaExceeded(error)) {
      return { kind: "storage-full", frameReached: framesDone };
    }
    return { kind: "failed", error: error instanceof Error ? error : new Error(String(error)) };
  }
}

async function encodeAll<Frame extends Closable, Block extends Closable>(
  job: ExportJob<Frame, Block>,
  framesTotal: number,
  countFrame: () => number,
): Promise<void> {
  const { frames, videoEncoder, audio, muxer, clock, signal } = job;
  const startMs = clock.now();
  const segments = audio === null ? [] : audioSegments(framesTotal);
  let segmentsSent = 0;
  for (let index = 0; index < framesTotal; index += 1) {
    signal.throwIfAborted();
    const timestampUs = frameTimestampUs(index);
    for (const segment of segments.slice(segmentsSent)) {
      if (audio === null || segment.timestampUs > timestampUs) {
        break;
      }
      segmentsSent += 1;
      const block = await abortable(audio.source.segment(segment), signal);
      encodeAndClose(block, () => audio.encoder.encode(block));
    }
    while (videoEncoder.encodeQueueSize > MAX_ENCODE_QUEUE) {
      await abortable(videoEncoder.dequeued(), signal);
    }
    await abortable(muxer.written(), signal);
    const frame = await abortable(
      frames.frameAt(frameTimeSeconds(index, job.durationMs), {
        timestampUs,
        durationUs: frameDurationUs(index),
      }),
      signal,
    );
    encodeAndClose(frame, () => videoEncoder.encode(frame, { keyFrame: isKeyFrame(index) }));
    const framesDone = countFrame();
    const msPerFrame = (clock.now() - startMs) / framesDone;
    job.onProgress?.({
      framesDone,
      framesTotal,
      remainingMs: msPerFrame * (framesTotal - framesDone),
    });
  }
  await abortable(videoEncoder.flush(), signal);
  if (audio !== null) {
    await abortable(audio.encoder.flush(), signal);
  }
  await abortable(muxer.finalize(), signal);
}

function encodeAndClose(item: Closable, encode: () => void): void {
  try {
    encode();
  } finally {
    item.close();
  }
}

async function cleanUp<Frame extends Closable, Block extends Closable>({
  videoEncoder,
  audio,
  muxer,
  sink,
}: ExportJob<Frame, Block>): Promise<void> {
  videoEncoder.close();
  audio?.encoder.close();
  // A writable that failed a write rejects its close with that same error, which the outcome
  // already carries; the file must be discarded all the same.
  await muxer.cancel().catch(() => undefined);
  await sink.discard();
}

/**
 * Settles with `work`, or rejects at once when `signal` aborts. A frame or block that arrives
 * after the abort is closed, since nothing will encode it.
 */
function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) {
      onAbort();
    }
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        if (!signal.aborted) {
          resolve(value);
        } else if (isClosable(value)) {
          value.close();
        }
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function isClosable(value: unknown): value is Closable {
  return typeof value === "object" && value !== null && "close" in value;
}

function isQuotaExceeded(error: unknown): boolean {
  if (error instanceof DOMException && error.name === QUOTA_EXCEEDED) {
    return true;
  }
  return error instanceof Error && error.cause !== undefined && isQuotaExceeded(error.cause);
}
