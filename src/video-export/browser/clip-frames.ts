import type { LiveFrame, VideoFrameSource } from "../../player";
import { MILLISECONDS_PER_SECOND } from "../../player";
import type { CanvasSink } from "mediabunny";
import { openClipFile, type OpenedClip } from "./open-clip";

/** Decoded frames in flight: the one handed out and the one being decoded. */
const CANVAS_POOL_SIZE = 2;

/** Reads a clip's file by a video slide's `src`. */
export type OpenVideo = (src: string) => Promise<Blob>;

interface Decoder {
  readonly clip: OpenedClip;
  readonly sink: CanvasSink;
  readonly firstSeconds: number;
}

/**
 * A clip's frames by time, decoded with WebCodecs through mediabunny straight from the file's
 * `Blob`: only the frame asked for is decoded, never the whole clip, and its canvas comes from a
 * small pool (ADR-0035). The file is opened at the first request.
 */
export class ClipFrames implements VideoFrameSource {
  readonly #src: string;
  readonly #openVideo: OpenVideo;
  readonly #maxWidth: number;
  #decoder: Promise<Decoder> | null = null;
  #disposed = false;

  /** `maxWidth`: frames are decoded no wider than the export's frame. */
  constructor(src: string, openVideo: OpenVideo, maxWidth: number) {
    this.#src = src;
    this.#openVideo = openVideo;
    this.#maxWidth = maxWidth;
  }

  async frameAt(clipMs: number): Promise<LiveFrame> {
    const { sink, firstSeconds } = await this.#open();
    // Before the first frame (a transition into the clip) the first one holds.
    const seconds = Math.max(clipMs / MILLISECONDS_PER_SECOND, firstSeconds);
    const wrapped = await sink.getCanvas(seconds);
    if (wrapped === null) {
      throw new Error(`the clip ${this.#src} has no frame at ${clipMs} ms`);
    }
    return wrapped.canvas;
  }

  dispose(): void {
    this.#disposed = true;
    void this.#decoder?.then(
      ({ clip }) => clip.dispose(),
      () => undefined,
    );
    this.#decoder = null;
  }

  #open(): Promise<Decoder> {
    this.#decoder ??= this.#load();
    return this.#decoder;
  }

  async #load(): Promise<Decoder> {
    const blob = await this.#openVideo(this.#src);
    const clip = await openClipFile(blob);
    if (clip === null) {
      throw new Error(`the clip ${this.#src} holds no video this browser can read`);
    }
    if (this.#disposed) {
      clip.dispose();
      throw new Error(`the clip ${this.#src} was disposed while opening`);
    }
    const { CanvasSink } = await import("./mediabunny-reader");
    return {
      clip,
      sink: new CanvasSink(clip.video, {
        width: Math.min(clip.video.displayWidth, this.#maxWidth),
        poolSize: CANVAS_POOL_SIZE,
      }),
      firstSeconds: await clip.video.getFirstTimestamp(),
    };
  }
}
