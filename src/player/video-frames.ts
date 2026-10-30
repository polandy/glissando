import type { LiveFrame, VideoFrameSource } from "./ports";
import type { Slide } from "./slideshow";
import { createClipPlan, type ClipTarget } from "./video-clip-plan";

/**
 * The frames of the video slides on screen for the video export: asks an injected
 * `VideoFrameSource` per clip for the exact frame of each requested show time, so the export
 * never waits on, or races, a playing element (ADR-0035).
 */
export class VideoFrames {
  readonly #plan: (timeMs: number) => readonly ClipTarget[];
  readonly #open: (src: string) => VideoFrameSource;
  readonly #sources = new Map<number, VideoFrameSource>();
  readonly #frames = new Map<number, LiveFrame>();

  constructor(slides: readonly Slide[], open: (src: string) => VideoFrameSource) {
    this.#plan = createClipPlan(slides);
    this.#open = open;
  }

  /** Decodes the frame of every clip on screen at `timeMs`; resolves once all are in hand. */
  async load(timeMs: number): Promise<void> {
    const onScreen = this.#plan(timeMs).filter((target) => target.phase !== "waiting");
    const wanted = new Set(onScreen.map((target) => target.index));
    for (const [index, source] of this.#sources) {
      if (!wanted.has(index)) {
        source.dispose();
        this.#sources.delete(index);
        this.#frames.delete(index);
      }
    }
    await Promise.all(
      onScreen.map(async ({ index, video, clipMs }) => {
        const source = this.#sources.get(index) ?? this.#open(video.src);
        this.#sources.set(index, source);
        this.#frames.set(index, await source.frameAt(clipMs));
      }),
    );
  }

  frameAt(index: number): LiveFrame | undefined {
    return this.#frames.get(index);
  }

  dispose(): void {
    this.#sources.forEach((source) => source.dispose());
    this.#sources.clear();
    this.#frames.clear();
  }
}
