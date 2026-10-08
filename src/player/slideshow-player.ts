import { ease } from "./easing";
import { framingAt, type Size } from "./ken-burns";
import { PictureBuffer } from "./picture-buffer";
import {
  MusicPlaybackError,
  type PlayerDependencies,
  type RenderFrame,
  type SlideLayer,
} from "./ports";
import type { Easing, Slideshow } from "./slideshow";
import { createTimeline, type SlideAtTime, type Timeline, type TimelineFrame } from "./timeline";

/** Events named and ordered as on an HTML media element. */
export const PLAYER_EVENTS = [
  "canplay",
  "play",
  "playing",
  "waiting",
  "pause",
  "seeked",
  "timeupdate",
  "ended",
  "error",
] as const;
export type PlayerEvent = (typeof PLAYER_EVENTS)[number];

const TRANSITION_EASING: Easing = "ease-in-out";
const MS_PER_SECOND = 1000;
/**
 * Plays a slideshow with the API of an HTML video element: `play`, `pause`, `currentTime` and
 * `duration` in seconds, and the media events in `PLAYER_EVENTS`.
 */
export class SlideshowPlayer<Picture extends Size> extends EventTarget {
  readonly #slideshow: Slideshow;
  readonly #timeline: Timeline;
  readonly #deps: PlayerDependencies<Picture>;
  readonly #pictures: PictureBuffer<Picture>;
  #timeMs = 0;
  /** Where the clock and the slideshow time met; set only while time advances. */
  #anchor: { readonly timeMs: number; readonly clockMs: number } | null = null;
  #paused = true;
  #ended = false;
  #ready = false;
  #destroyed = false;
  #error: Error | null = null;
  #frameHandle: number | null = null;
  /** Bumped by every seek, play and pause, so a load finishing late cannot act on stale state. */
  #generation = 0;

  constructor(slideshow: Slideshow, dependencies: PlayerDependencies<Picture>) {
    super();
    this.#slideshow = slideshow;
    this.#timeline = createTimeline(slideshow.slides);
    this.#deps = dependencies;
    this.#pictures = new PictureBuffer(
      slideshow.slides.map((slide) => slide.image.src),
      dependencies.pictures,
      dependencies.renderer,
    );
    this.#whenDrawable(() => this.#draw());
  }

  get duration(): number {
    return this.#timeline.durationMs / MS_PER_SECOND;
  }

  get currentTime(): number {
    return this.#liveTimeMs() / MS_PER_SECOND;
  }

  set currentTime(seconds: number) {
    this.#assertAlive();
    this.#stopAdvancing();
    this.#timeMs = Math.min(this.#timeline.durationMs, Math.max(0, seconds * MS_PER_SECOND));
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
    this.#paused = true;
    this.#destroyed = true;
    this.#pictures.clear();
    this.#deps.music?.dispose();
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
      this.#anchor = { timeMs: this.#timeMs, clockMs: this.#deps.clock.now() };
      this.#draw();
      onFirstFrame?.();
      this.#emit("playing");
      this.#scheduleFrame();
      this.#deps.music?.play(this.#timeMs / MS_PER_SECOND).catch((cause: unknown) => {
        this.#fail(new MusicPlaybackError(cause));
      });
    };
    if (this.#isDrawable()) {
      advance();
      return;
    }
    this.#deps.music?.pause();
    this.#emit("waiting");
    this.#whenDrawable(advance);
  }

  #stopAdvancing(): void {
    this.#generation += 1;
    if (this.#anchor !== null) {
      this.#timeMs = this.#liveTimeMs();
      this.#anchor = null;
      this.#deps.music?.pause();
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
    if (!this.#isDrawable()) {
      this.#stopAdvancing();
      this.#startAdvancing();
      return;
    }
    this.#draw();
    this.#emit("timeupdate");
    this.#scheduleFrame();
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
    this.#deps.renderer.render(this.#renderFrame(this.#currentFrame()));
    this.#loadAroundCurrentFrame().catch(() => {
      // The buffer retries a failed picture and reports it once the frame needs it.
    });
    if (!this.#ready) {
      this.#ready = true;
      this.#emit("canplay");
    }
  }

  #renderFrame(frame: TimelineFrame): RenderFrame<Picture> {
    if (frame.kind === "slide") {
      return { kind: "slide", slide: this.#layer(frame.slide) };
    }
    return {
      kind: "transition",
      effect: frame.effect,
      progress: ease(TRANSITION_EASING, frame.progress),
      from: this.#layer(frame.from),
      to: this.#layer(frame.to),
    };
  }

  #layer(slideAtTime: SlideAtTime): SlideLayer<Picture> {
    const picture = this.#pictures.get(slideAtTime.index);
    const slide = this.#slideshow.slides[slideAtTime.index];
    if (picture === undefined || slide === undefined) {
      throw new Error(`slide ${slideAtTime.index} is drawn before its picture loaded`);
    }
    return { picture, framing: framingAt(slide.kenBurns, slideAtTime.kenBurnsProgress) };
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
