import type { TransitionEffect } from "./slideshow";
import type { KenBurnsAt, Size } from "./ken-burns";

/**
 * A slide's picture with its Ken Burns motion at the moment drawn, its caption if it has one,
 * its partner if it is composed as a pair, and `fit` (ADR-0028).
 */
export interface SlideLayer<Picture> {
  readonly picture: Picture;
  readonly motion: KenBurnsAt;
  readonly partner?: { readonly picture: Picture; readonly motion: KenBurnsAt };
  /** `"cover"` turns the blurred fill off; absent: whole picture over a fill if needed. */
  readonly fit?: "cover";
  readonly caption?: string;
}

/** A picture to draw later, with the caption it will be drawn with. A pair prepares each picture on its own call. */
export interface PreparedSlide<Picture> {
  readonly picture: Picture;
  readonly caption?: string;
}

export type RenderFrame<Picture> =
  | { readonly kind: "slide"; readonly slide: SlideLayer<Picture> }
  | {
      readonly kind: "transition";
      readonly effect: TransitionEffect;
      /** Eased, 0..1. */
      readonly progress: number;
      readonly from: SlideLayer<Picture>;
      readonly to: SlideLayer<Picture>;
    };

/** Draws frames into its viewport; WebGL2 or the DOM fallback. */
export interface SlideRenderer<Picture extends Size> {
  render(frame: RenderFrame<Picture>): void;
  /**
   * Does a bounded part of the work to draw this slide later, e.g. one slice of a texture upload,
   * so no single frame pays for all of it; drawing it unprepared finishes the rest at once.
   */
  prepare(slide: PreparedSlide<Picture>): void;
  /** Lifts every caption by `cssPixels` from the bottom, e.g. above the player's controls. */
  setCaptionInset(cssPixels: number): void;
  /** The picture will not be drawn again; free what the renderer holds for it. */
  forget(picture: Picture): void;
  dispose(): void;
}

export interface PictureLoader<Picture extends Size> {
  load(src: string): Promise<Picture>;
  release(picture: Picture): void;
  /** No picture will be loaded again; free what the loader holds, e.g. its worker. */
  dispose(): void;
}

/** Milliseconds on a monotonic clock. */
export interface Clock {
  now(): number;
}

export interface FrameScheduler {
  request(callback: () => void): number;
  cancel(handle: number): void;
}

export interface MusicPlayback {
  /** Plays from `atSeconds`; rejects when the browser refuses playback. */
  play(atSeconds: number): Promise<void>;
  /** From 0 (silent) to 1 (as recorded). */
  setVolume(volume: number): void;
  pause(): void;
  dispose(): void;
}

/** The browser refused to play the music, e.g. without a user gesture. */
export class MusicPlaybackError extends Error {
  constructor(cause: unknown) {
    super("the browser refused to play the music", { cause });
    this.name = "MusicPlaybackError";
  }
}

export interface PlayerDependencies<Picture extends Size> {
  readonly renderer: SlideRenderer<Picture>;
  readonly pictures: PictureLoader<Picture>;
  readonly clock: Clock;
  readonly frames: FrameScheduler;
  /** Opens one playback per track of the slideshow's music. */
  readonly openMusic?: (src: string) => MusicPlayback;
  /** Slides loaded beyond the last one on screen; `DEFAULT_PICTURES_AHEAD` without it. */
  readonly picturesAhead?: number;
}
