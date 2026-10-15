import type { LiveSlideFrames } from "./frame-pictures";
import type { Size } from "./ken-burns";
import type { LiveFrame, PlayerDependencies } from "./ports";
import { isGroundSlide, type Slideshow } from "./slideshow";
import { VideoClips } from "./video-clips";
import { VideoFrames } from "./video-frames";

export interface PlayerVideoListeners {
  readonly onError: (error: Error) => void;
  /** A clip has a frame to draw that it did not have before. */
  readonly onFrameReady: () => void;
}

/**
 * A player's video slides: the clips it plays in real time (`openVideo`) and, for the video
 * export, the frames it asks an injected source for (`openVideoFrames`). Null for a slideshow
 * without a clip or a player without either.
 */
export class PlayerVideo implements LiveSlideFrames {
  readonly #clips: VideoClips | null;
  readonly #frames: VideoFrames | null;

  static of(
    slideshow: Slideshow,
    dependencies: Pick<PlayerDependencies<Size>, "openVideo" | "openVideoFrames">,
    listeners: PlayerVideoListeners,
  ): PlayerVideo | null {
    const hasClip = slideshow.slides.some((slide) => !isGroundSlide(slide) && slide.video);
    const { openVideo, openVideoFrames } = dependencies;
    if (!hasClip || (openVideo === undefined && openVideoFrames === undefined)) {
      return null;
    }
    return new PlayerVideo(
      openVideo === undefined ? null : new VideoClips(slideshow.slides, openVideo, listeners),
      openVideoFrames === undefined ? null : new VideoFrames(slideshow.slides, openVideoFrames),
    );
  }

  private constructor(clips: VideoClips | null, frames: VideoFrames | null) {
    this.#clips = clips;
    this.#frames = frames;
  }

  place(timeMs: number): void {
    this.#clips?.place(timeMs);
  }

  frameAt(index: number): LiveFrame | undefined {
    return this.#frames?.frameAt(index) ?? this.#clips?.frameAt(index);
  }

  /** Whether the clips on screen at `timeMs` can play on; true without live clips. */
  isReady(timeMs: number): boolean {
    return this.#clips?.isReady(timeMs) ?? true;
  }

  /** Resolves once the clips on screen at `timeMs` can play on; at once without live clips. */
  whenReady(timeMs: number): Promise<void> {
    return this.#clips?.whenReady(timeMs) ?? Promise.resolve();
  }

  /** Plays the clips on screen from `timeMs`; call it in the user's play gesture (Safari). */
  play(timeMs: number): void {
    this.#clips?.play(timeMs);
  }

  pause(): void {
    this.#clips?.pause();
  }

  /** The show jumped to a new time. */
  restart(): void {
    this.#clips?.restart();
  }

  /** Decodes the frames the export needs at `timeMs`; resolves at once without a frame source. */
  load(timeMs: number): Promise<void> {
    return this.#frames?.load(timeMs) ?? Promise.resolve();
  }

  dispose(): void {
    this.#clips?.dispose();
    this.#frames?.dispose();
  }
}
