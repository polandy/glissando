import { describe, expect, it } from "vitest";
import { probeVideoExport } from "..";
import {
  WebCodecsAudioEncoder,
  WebCodecsVideoEncoder,
  type AudioChunkOutput,
  type VideoChunkOutput,
} from "./encoders";
import type { ExportTarget } from "./file-targets";
import { runVideoExportWith, type ExportEncoders } from "./run-video-export";
import { generatedPicture, generatedTone, GENERATED_SLIDESHOW } from "../testing/generated-media";
import type { AudioEncoderPort, VideoEncoderPort } from "../ports";

/** Delegates to the real encoder and remembers that it was closed. */
class RecordingVideoEncoder implements VideoEncoderPort<VideoFrame> {
  closed = false;
  readonly #inner: WebCodecsVideoEncoder;

  constructor(config: VideoEncoderConfig, output: VideoChunkOutput) {
    this.#inner = new WebCodecsVideoEncoder(config, output);
  }

  get encodeQueueSize(): number {
    return this.#inner.encodeQueueSize;
  }

  dequeued(): Promise<void> {
    return this.#inner.dequeued();
  }

  encode(frame: VideoFrame, options: { readonly keyFrame: boolean }): void {
    this.#inner.encode(frame, options);
  }

  flush(): Promise<void> {
    return this.#inner.flush();
  }

  close(): void {
    this.closed = true;
    this.#inner.close();
  }
}

/** Delegates to the real encoder and remembers that it was closed. */
class RecordingAudioEncoder implements AudioEncoderPort<AudioData> {
  closed = false;
  readonly #inner: WebCodecsAudioEncoder;

  constructor(config: AudioEncoderConfig, output: AudioChunkOutput) {
    this.#inner = new WebCodecsAudioEncoder(config, output);
  }

  encode(block: AudioData): void {
    this.#inner.encode(block);
  }

  flush(): Promise<void> {
    return this.#inner.flush();
  }

  close(): void {
    this.closed = true;
    this.#inner.close();
  }
}

/** A target whose writable and discard leave a trace of what the run did to them. */
function recordingTarget() {
  const trace = { opened: false, aborted: false, closed: false, discarded: false };
  const stream = new WritableStream({
    abort: () => {
      trace.aborted = true;
    },
    close: () => {
      trace.closed = true;
    },
  });
  const target: ExportTarget = {
    kind: "private",
    fileName: "failure.mp4",
    open: () => {
      trace.opened = true;
      return Promise.resolve(stream);
    },
    file: () => Promise.reject(new Error("a failed run has no file")),
    discard: () => {
      trace.discarded = true;
      return Promise.resolve();
    },
  };
  return { target, trace };
}

async function runWith(encoders: ExportEncoders, target: ExportTarget) {
  const capabilities = await probeVideoExport({ withAudio: true });
  if (!capabilities.supported) {
    throw new Error(`this engine cannot export: ${capabilities.reason}`);
  }
  const pictures = new Map([
    ["first", await generatedPicture("#c0392b", "1")],
    ["second", await generatedPicture("#2471a3", "2")],
  ]);
  return runVideoExportWith(encoders, {
    slideshow: GENERATED_SLIDESHOW,
    openPicture: (src) => {
      const picture = pictures.get(src);
      return picture === undefined
        ? Promise.reject(new Error(`no generated picture ${src}`))
        : Promise.resolve(picture);
    },
    openMusic: (src) =>
      src === "tone" ? Promise.resolve(generatedTone()) : Promise.reject(new Error(src)),
    preset: "720p",
    audioCodec: capabilities.audioCodec,
    target,
    signal: new AbortController().signal,
  });
}

describe("runVideoExport when an encoder cannot be built", () => {
  it("resolves as failed and leaves no file behind when the video encoder cannot be built", async () => {
    const cause = new Error("no video encoder here");
    const { target, trace } = recordingTarget();
    const built: { audio: RecordingAudioEncoder | null } = { audio: null };
    const encoders: ExportEncoders = {
      video: () => {
        throw cause;
      },
      audio: (config, output) => (built.audio = new RecordingAudioEncoder(config, output)),
    };

    const result = await runWith(encoders, target);

    expect(trace.opened).toBe(true);
    expect(result.kind === "failed" && result.error).toBe(cause);
    expect(trace.aborted).toBe(true);
    expect(trace.closed).toBe(false);
    expect(trace.discarded).toBe(true);
    expect(built.audio).toBeNull();
  });

  it("closes the video encoder when the audio encoder cannot be built", async () => {
    const cause = new Error("no audio encoder here");
    const { target, trace } = recordingTarget();
    const built: { video: RecordingVideoEncoder | null } = { video: null };
    const encoders: ExportEncoders = {
      video: (config, output) => (built.video = new RecordingVideoEncoder(config, output)),
      audio: () => {
        throw cause;
      },
    };

    const result = await runWith(encoders, target);

    expect(built.video).not.toBeNull();
    expect(result.kind === "failed" && result.error).toBe(cause);
    expect(trace.aborted).toBe(true);
    expect(trace.discarded).toBe(true);
    expect(built.video?.closed).toBe(true);
  });
});
