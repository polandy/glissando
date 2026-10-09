import { CaptionInset } from "./caption-inset";
import type { Size } from "./ken-burns";
import { PictureBuffer } from "./picture-buffer";
import { MusicPlaybackError, type PlayerDependencies } from "./ports";
import { renderFrame } from "./render-frame";
import { MILLISECONDS_PER_SECOND, type Slideshow } from "./slideshow";
import { TrimmedMusic } from "./trimmed-music";
import { createTimeline, type SlideAtTime, type Timeline, type TimelineFrame } from "./timeline";

import type { PlayerEvent } from "./player-events";

/**
 * Plays a slideshow with the API of an HTML video element: `play`, `pause`, `currentTime` and
 * `duration` in seconds, and the media events in `PLAYER_EVENTS`.
 */
export class SlideshowPlayer<Picture extends Size> extends EventTarget {
  readonly #slideshow: Slideshow;
  readonly #timeline: Timeline;
  readonly #deps: PlayerDependencies<Picture>;
  readonly #pictures: PictureBuffer<Picture>;
  readonly #music: TrimmedMusic | null;
  #timeMs = 0;
  /** Where the clock and the slideshow time met; set only while time advances. */
  #anchor: { readonly timeMs: number; readonly clockMs: number } | null = null;
  #paused = true;
  #ended = false;
  #ready = false;
  #destroyed = false;
  #error: Error | null = null;
  #frameHandle: number | null = null;
  readonly #captionInset: CaptionInset;
  /** Bumped by every seek, play and pause, so a load finishing late cannot act on stale state. */
  #generation = 0;

  constructor(slideshow: Slideshow, dependencies: PlayerDependencies<Picture>) {
    super();
    this.#slideshow = slideshow;
    this.#timeline = createTimeline(slideshow.slides);
    this.#deps = dependencies;
    this.#music =
      slideshow.music === undefined || dependencies.music === undefined
        ? null
        : new TrimmedMusic(slideshow.music, dependencies.music);
    this.#captionInset = new CaptionInset({
      clock: dependencies.clock,
      frames: dependencies.frames,
      isPlaybackDrawing: () => this.#frameHandle !== null,
      redraw: () => this.redraw(),
    });
    this.#pictures = new PictureBuffer(
      slideshow.slides.map((slide) => slide.image.src),
      dependencies.pictures,
      dependencies.renderer,
    );
    this.#whenDrawable(() => this.#draw());
  }

  get duration(): number {
    return this.#timeline.durationMs / MILLISECONDS_PER_SECOND;
  }

  get currentTime(): number {
    return this.#liveTimeMs() / MILLISECONDS_PER_SECOND;
  }

  set currentTime(seconds: number) {
    this.#assertAlive();
    this.#stopAdvancing();
    this.#timeMs = Math.min(
      this.#timeline.durationMs,
      Math.max(0, seconds * MILLISECONDS_PER_SECOND),
    );
    this.#ended = false;
    const announceSeeked = () => {
      this.#emit("seeked");
      this.#emit("timeupdate");
    };
    if (this.#paused) {
      this.#whenDrawable(() => {
        this.#draw();
        announceSeeked();
      });
    } else {
      this.#startAdvancing(announceSeeked);
    }
  }

  get paused(): boolean {
    return this.#paused;
  }

  get ended(): boolean {
    return this.#ended;
  }

  /** True once the first frame is on screen. */
  get ready(): boolean {
    return this.#ready;
  }

  get error(): Error | null {
    return this.#error;
  }

  play(): void {
    this.#assertAlive();
    if (!this.#paused) {
      return;
    }
    if (this.#ended || this.#timeMs >= this.#timeline.durationMs) {
      this.#timeMs = 0;
      this.#ended = false;
    }
    this.#paused = false;
    this.#error = null;
    this.#emit("play");
    this.#startAdvancing();
  }

  pause(): void {
    if (this.#paused) {
      return;
    }
    this.#stopAdvancing();
    this.#paused = true;
    this.#emit("pause");
    this.#captionInset.follow();
  }

  /**
   * How far, in CSS pixels, every caption sits above its usual place at the bottom: the height of
   * controls laid over the player while they show, 0 otherwise. Setting it glides the captions
   * there over the next frames (`CAPTION_GLIDE_MS`), also while paused.
   */
  get captionInset(): number {
    return this.#captionInset.target;
  }

  set captionInset(cssPixels: number) {
    this.#captionInset.glideTo(cssPixels);
  }

  /** Sets `captionInset` at once, without a glide. */
  jumpCaptionInset(cssPixels: number): void {
    this.#captionInset.jumpTo(cssPixels);
  }

  /** Draws the current frame again, e.g. after the viewport changed size. */
  redraw(): void {
    if (!this.#destroyed && this.#isDrawable()) {
      this.#draw();
    }
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }
    this.#stopAdvancing();
    this.#captionInset.dispose();
    this.#paused = true;
    this.#destroyed = true;
    this.#pictures.clear();
    this.#deps.pictures.dispose();
    this.#music?.dispose();
    this.#deps.renderer.dispose();
  }

  #liveTimeMs(): number {
    if (this.#anchor === null) {
      return this.#timeMs;
    }
    const elapsedMs = this.#deps.clock.now() - this.#anchor.clockMs;
    return Math.min(this.#timeline.durationMs, this.#anchor.timeMs + elapsedMs);
  }

  /** Advances from the current time, after waiting for its pictures if they are missing. */
  #startAdvancing(onFirstFrame?: () => void): void {
    const advance = () => {
      // Anchored after drawing, so the time the first frame takes never shows as a jump.
      this.#draw();
      this.#anchor = { timeMs: this.#timeMs, clockMs: this.#deps.clock.now() };
      onFirstFrame?.();
      this.#emit("playing");
      this.#scheduleFrame();
      this.#music?.play(this.#timeMs).catch((cause: unknown) => {
        this.#fail(new MusicPlaybackError(cause));
      });
    };
    if (this.#isDrawable()) {
      advance();
      return;
    }
    this.#music?.pause();
    this.#emit("waiting");
    this.#whenDrawable(advance);
  }

  #stopAdvancing(): void {
    this.#generation += 1;
    if (this.#anchor !== null) {
      this.#timeMs = this.#liveTimeMs();
      this.#anchor = null;
      this.#music?.pause();
    }
    if (this.#frameHandle !== null) {
      this.#deps.frames.cancel(this.#frameHandle);
      this.#frameHandle = null;
    }
  }

  #scheduleFrame(): void {
    this.#frameHandle = this.#deps.frames.request(() => this.#onAnimationFrame());
  }

  #onAnimationFrame(): void {
    this.#frameHandle = null;
    const timeMs = this.#liveTimeMs();
    if (timeMs >= this.#timeline.durationMs) {
      this.#finish();
      return;
    }
    this.#timeMs = timeMs;
    this.#music?.follow(timeMs);
    if (!this.#isDrawable()) {
      this.#stopAdvancing();
      this.#startAdvancing();
      return;
    }
    this.#draw();
    this.#prepareUpcoming();
    this.#emit("timeupdate");
    this.#scheduleFrame();
  }

  /** Spreads the work to draw the next pictures over the frames before they come on screen. */
  #prepareUpcoming(): void {
    const onScreen = slidesOf(this.#currentFrame()).map((slide) => slide.index);
    for (const { index, picture } of this.#pictures.loadedAfter(onScreen)) {
      const caption = this.#slideshow.slides[index]?.caption;
      this.#deps.renderer.prepare(caption === undefined ? { picture } : { picture, caption });
    }
  }

  #finish(): void {
    this.#stopAdvancing();
    this.#timeMs = this.#timeline.durationMs;
    this.#draw();
    this.#emit("timeupdate");
    this.#paused = true;
    this.#ended = true;
    this.#emit("pause");
    this.#emit("ended");
    this.#captionInset.follow();
  }

  #fail(error: Error): void {
    this.#error = error;
    this.pause();
    this.#emit("error");
  }

  /** Runs `action` once the current frame's pictures are loaded, unless the state moved on. */
  #whenDrawable(action: () => void): void {
    const generation = this.#generation;
    this.#loadAroundCurrentFrame().then(
      () => {
        if (generation === this.#generation && !this.#destroyed && this.#isDrawable()) {
          action();
        }
      },
      (error: unknown) => {
        if (generation === this.#generation && !this.#destroyed) {
          this.#fail(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
  }

  #isDrawable(): boolean {
    return slidesOf(this.#currentFrame()).every(
      (slide) => this.#pictures.get(slide.index) !== undefined,
    );
  }

  #currentFrame(): TimelineFrame {
    return this.#timeline.frameAt(this.#timeMs);
  }

  #draw(): void {
    this.#deps.renderer.setCaptionInset(this.#captionInset.current);
    this.#deps.renderer.render(
      renderFrame(this.#currentFrame(), this.#slideshow, (index) => this.#pictures.get(index)),
    );
    this.#loadAroundCurrentFrame().catch(() => {
      // The buffer retries a failed picture and reports it once the frame needs it.
    });
    if (!this.#ready) {
      this.#ready = true;
      this.#emit("canplay");
    }
  }

  #loadAroundCurrentFrame(): Promise<void> {
    return this.#pictures.keep(slidesOf(this.#currentFrame()).map((slide) => slide.index));
  }

  #emit(type: PlayerEvent): void {
    this.dispatchEvent(new Event(type));
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new Error("the player was destroyed; create a new one to play again");
    }
  }
}

function slidesOf(frame: TimelineFrame): readonly SlideAtTime[] {
  return frame.kind === "slide" ? [frame.slide] : [frame.from, frame.to];
}
