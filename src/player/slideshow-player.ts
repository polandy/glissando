import { settleSeek } from "./settle-seek";
import { CaptionInset } from "./caption-inset";
import { FramePictures } from "./frame-pictures";
import { PlaybackTime } from "./playback-time";
import type { Size } from "./ken-burns";
import { PlaybackLoop } from "./playback-loop";
import { PlayerMedia } from "./player-media";
import type { PlayerDependencies } from "./ports";
import { MILLISECONDS_PER_SECOND, type Slideshow } from "./slideshow";
import { createTimeline, type Timeline } from "./timeline";
import type { PlayerEvent } from "./player-events";

/**
 * Plays a slideshow with the API of an HTML video element: `play`, `pause`, `currentTime` and
 * `duration` in seconds, and the media events in `PLAYER_EVENTS`.
 */
export class SlideshowPlayer<Picture extends Size> extends EventTarget {
  readonly #timeline: Timeline;
  readonly #deps: PlayerDependencies<Picture>;
  readonly #pictures: FramePictures<Picture>;
  readonly #media: PlayerMedia;
  readonly #time: PlaybackTime;
  #paused = true;
  #ended = false;
  #ready = false;
  #destroyed = false;
  #error: Error | null = null;
  readonly #captionInset: CaptionInset;
  readonly #loop: PlaybackLoop<Picture>;

  constructor(slideshow: Slideshow, dependencies: PlayerDependencies<Picture>) {
    super();
    this.#timeline = createTimeline(slideshow.slides);
    this.#time = new PlaybackTime(dependencies.clock, this.#timeline.durationMs);
    this.#deps = dependencies;
    this.#media = new PlayerMedia(slideshow, dependencies, {
      onError: (error) => this.#fail(error),
      // Playback draws the next frame anyway; a paused show draws the frame that arrived.
      onFrameReady: () => {
        if (this.#paused) {
          this.redraw();
        }
      },
    });
    this.#captionInset = new CaptionInset({
      clock: dependencies.clock,
      frames: dependencies.frames,
      isPlaybackDrawing: () => this.#loop.isDrawing,
      redraw: () => this.redraw(),
    });
    const reducedMotion = dependencies.reducedMotion ?? (() => false);
    this.#pictures = new FramePictures(
      slideshow,
      () => this.#timeline.frameAt(this.#time.frameMs),
      () => ({ showDurationMs: this.#timeline.durationMs, reducedMotion: reducedMotion() }),
      dependencies.pictures,
      dependencies.renderer,
      dependencies.picturesAhead,
      this.#media.video,
    );
    this.#loop = new PlaybackLoop({
      time: this.#time,
      media: this.#media,
      pictures: this.#pictures,
      frames: dependencies.frames,
      draw: () => this.#draw(),
      emit: (type) => this.#emit(type),
      whenDrawable: (action) => this.#whenDrawable(action),
      onEnded: () => {
        this.#paused = true;
        this.#ended = true;
        this.#emit("pause");
        this.#emit("ended");
        this.#captionInset.follow();
      },
    });
    this.#whenDrawable(() => this.#draw());
  }

  get duration(): number {
    return this.#time.durationMs / MILLISECONDS_PER_SECOND;
  }

  get currentTime(): number {
    return this.#time.liveMs() / MILLISECONDS_PER_SECOND;
  }

  set currentTime(seconds: number) {
    this.#assertAlive();
    this.#loop.stop();
    this.#media.restart();
    this.#time.holdAt(seconds * MILLISECONDS_PER_SECOND);
    this.#ended = false;
    settleSeek({
      paused: this.#paused,
      target: this,
      whenDrawable: (action) => this.#whenDrawable(action),
      draw: () => this.#draw(),
      startAdvancing: (onFirstFrame) => this.#loop.start(onFirstFrame),
    });
  }

  startAt(seconds: number): void {
    this.currentTime = seconds;
    this.#media.fadeMusicInFrom(seconds * MILLISECONDS_PER_SECOND);
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
    if (this.#ended || this.#time.isAtEnd) {
      this.#media.restart();
      this.#time.holdAt(0);
      this.#ended = false;
    }
    this.#paused = false;
    this.#error = null;
    this.#emit("play");
    this.#loop.start();
  }

  pause(): void {
    if (this.#paused) return;
    this.#loop.stop();
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

  /**
   * For the video export: pauses without events, moves to `seconds` (clamped), waits for that
   * frame's pictures, draws it and prepares the upcoming ones. Rejects with the load's error.
   */
  async renderAt(seconds: number): Promise<void> {
    this.#assertAlive();
    this.#loop.stop();
    this.#paused = true;
    this.#ended = false;
    this.#time.holdAt(seconds * MILLISECONDS_PER_SECOND);
    const generation = this.#loop.generation;
    await Promise.all([this.#pictures.loadAroundScreen(), this.#media.load(this.#time.frameMs)]);
    if (this.#destroyed || generation !== this.#loop.generation) {
      throw new Error(`the frame at ${seconds} s was superseded before it was drawn`);
    }
    this.#pictures.draw(this.#captionInset.current);
    this.#pictures.prepareUpcoming();
  }

  /** Draws the current frame again, e.g. after the viewport changed size. */
  redraw(): void {
    if (!this.#destroyed && this.#pictures.areOnScreenLoaded()) {
      this.#draw();
    }
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }
    this.#loop.stop();
    this.#captionInset.dispose();
    this.#paused = true;
    this.#destroyed = true;
    this.#pictures.clear();
    this.#deps.pictures.dispose();
    this.#media.dispose();
    this.#deps.renderer.dispose();
  }

  #fail(error: Error): void {
    this.#error = error;
    this.pause();
    this.#emit("error");
  }

  /** Runs `action` once the current frame's pictures are loaded, unless the state moved on. */
  #whenDrawable(action: () => void): void {
    const generation = this.#loop.generation;
    this.#pictures.whenOnScreenLoaded({
      isWanted: () => generation === this.#loop.generation && !this.#destroyed,
      onLoaded: action,
      onError: (error) => this.#fail(error),
    });
  }

  #draw(): void {
    this.#pictures.draw(this.#captionInset.current);
    this.#pictures.loadAroundScreen().catch(() => {
      // The buffer retries a failed picture and reports it once the frame needs it.
    });
    if (!this.#ready) {
      this.#ready = true;
      this.#emit("canplay");
    }
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
