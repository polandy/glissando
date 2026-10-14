import type { Card, TransitionEffect } from "./slideshow";
import type { KenBurnsAt, Size } from "./ken-burns";

/**
 * A card's look at the moment drawn (ADR-0032): the card itself plus `cardTimingAt`'s numbers,
 * so the renderers never recompute the timing. `slideTimeMs` and `reducedMotion` are carried
 * through so a renderer can derive each item's own visual (`cardItemTimingAt`) itself, never the
 * wall clock.
 */
export interface CardVisual {
  readonly card: Card;
  readonly textOpacity: number;
  readonly driftEm: number;
  readonly veilAmount: number;
  readonly slideTimeMs: number;
  readonly reducedMotion: boolean;
}

/**
 * A slide's picture with its Ken Burns motion at the moment drawn, its caption if it has one,
 * its partner if it is composed as a pair, `fit` (ADR-0028), and its card if it has one
 * (ADR-0032). `captionOpacity` is the caption's extra fade while a card shares the slide; absent
 * is opaque.
 */
export interface PictureSlideLayer<Picture> {
  readonly kind: "picture";
  readonly picture: Picture;
  readonly motion: KenBurnsAt;
  readonly partner?: { readonly picture: Picture; readonly motion: KenBurnsAt };
  /** `"cover"` turns the blurred fill off; absent: whole picture over a fill if needed. */
  readonly fit?: "cover";
  readonly caption?: string;
  readonly captionOpacity?: number;
  readonly card?: CardVisual;
}

/** A ground slide: a solid colour behind its card (ADR-0032); always carries a card. */
export interface GroundSlideLayer {
  readonly kind: "ground";
  /** `#RRGGBB`. */
  readonly ground: string;
  readonly card: CardVisual;
}

export type SlideLayer<Picture> = PictureSlideLayer<Picture> | GroundSlideLayer;

/**
 * What to prepare ahead of a slide coming on screen: its picture and caption, or a ground
 * slide's card texture alone. A pair prepares each picture on its own call.
 */
export type PreparedSlide<Picture> =
  | { readonly picture: Picture; readonly caption?: string; readonly card?: Card }
  | { readonly ground: string; readonly card: Card };

export type RenderFrame<Picture> =
  | {
      readonly kind: "slide";
      readonly slide: SlideLayer<Picture>;
      /** 0 clear .. 1 black, mixed over the whole frame at the show's end (ADR-0032). */
      readonly endFade: number;
    }
  | {
      readonly kind: "transition";
      readonly effect: TransitionEffect;
      /** Eased, 0..1. */
      readonly progress: number;
      readonly from: SlideLayer<Picture>;
      readonly to: SlideLayer<Picture>;
      readonly endFade: number;
    };

/** Draws frames into its viewport; WebGL2 or the DOM fallback. */
export interface SlideRenderer<Picture extends Size> {
  render(frame: RenderFrame<Picture>): void;
  /**
   * Settles once `card`'s title and subtitle can actually be drawn (its font loaded, its texture
   * built). Absent, or settled already, for a renderer with nothing to wait for, e.g. the DOM
   * fallback, which lays the card out as real DOM text. Used to hold the very first frame of
   * playback until the opening slide's own card is truly drawable, so its whole entrance is seen
   * from its true start (ADR-0032).
   */
  cardReady?(card: Card): Promise<void>;
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
  /** Read fresh for each frame; a card's drift and fades shorten under it (ADR-0032). Absent: false. */
  readonly reducedMotion?: () => boolean;
}
