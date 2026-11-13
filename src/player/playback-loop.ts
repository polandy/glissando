import type { FramePictures } from "./frame-pictures";
import type { Size } from "./ken-burns";
import type { PlayerMedia } from "./player-media";
import type { PlaybackTime } from "./playback-time";
import type { PlayerEvent } from "./player-events";
import type { FrameScheduler } from "./ports";

/** What the loop reads and drives of its player. */
export interface PlaybackLoopHost<Picture extends Size> {
  readonly time: PlaybackTime;
  readonly media: PlayerMedia;
  readonly pictures: FramePictures<Picture>;
  readonly frames: FrameScheduler;
  draw(): void;
  emit(type: PlayerEvent): void;
  /** Runs `action` once the current frame's pictures are loaded, unless the state moved on. */
  whenDrawable(action: () => void): void;
  /** A picture on screen failed to load: the player stops with that error. */
  fail(error: Error): void;
  /** The show played to its end and its last frame is drawn: the player stands paused there. */
  onEnded(): void;
}

/** The animation-frame loop that advances a playing slideshow, and its stopping. */
export class PlaybackLoop<Picture extends Size> {
  readonly #host: PlaybackLoopHost<Picture>;
  #frameHandle: number | null = null;
  /** Bumped by every stop, so a load finishing late cannot act on stale state. */
  #generation = 0;
  /** True from the frame that found a picture on screen missing until a frame is drawn again. */
  #pictureIsLate = false;

  constructor(host: PlaybackLoopHost<Picture>) {
    this.#host = host;
  }

  get generation(): number {
    return this.#generation;
  }

  /** True while a frame is scheduled, i.e. while playback draws the frames itself. */
  get isDrawing(): boolean {
    return this.#frameHandle !== null;
  }

  /** Advances from the current time, after waiting for its pictures if they are missing. */
  start(onFirstFrame?: () => void): void {
    const { time, media, pictures } = this.#host;
    const advance = () => {
      // Anchored after drawing, so the time the first frame takes never shows as a jump.
      this.#host.draw();
      time.startAdvancing();
      onFirstFrame?.();
      this.#host.emit("playing");
      this.#scheduleFrame();
      media.play(time.frameMs);
    };
    if (pictures.isOnScreenPlayable()) {
      advance();
      return;
    }
    media.pause();
    this.#host.emit("waiting");
    this.#host.whenDrawable(advance);
  }

  stop(): void {
    this.#generation += 1;
    this.#pictureIsLate = false;
    if (this.#host.time.stopAdvancing()) {
      this.#host.media.pause();
    }
    if (this.#frameHandle !== null) {
      this.#host.frames.cancel(this.#frameHandle);
      this.#frameHandle = null;
    }
  }

  #scheduleFrame(): void {
    this.#frameHandle = this.#host.frames.request(() => this.#onAnimationFrame());
  }

  #onAnimationFrame(): void {
    const { time, media, pictures } = this.#host;
    this.#frameHandle = null;
    const timeMs = time.catchUp();
    if (time.isAtEnd) {
      this.#finish();
      return;
    }
    media.follow(timeMs);
    if (pictures.areOnScreenLoaded()) {
      this.#host.draw();
      pictures.prepareUpcoming();
      if (this.#pictureIsLate) {
        this.#pictureIsLate = false;
        this.#host.emit("playing");
      }
    } else {
      this.#awaitLatePicture();
    }
    this.#host.emit("timeupdate");
    this.#scheduleFrame();
  }

  /** The show stays on the music's schedule (ADR-0057): the last frame drawn stays on screen. */
  #awaitLatePicture(): void {
    if (!this.#pictureIsLate) {
      this.#pictureIsLate = true;
      this.#host.emit("waiting");
    }
    const generation = this.#generation;
    this.#host.pictures.loadAroundScreen().catch((error: unknown) => {
      if (generation === this.#generation) {
        this.#host.fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  #finish(): void {
    const { time, pictures } = this.#host;
    this.stop();
    time.holdAt(time.durationMs);
    // A late frame can land past the end before the last slide's picture was ever needed.
    if (!pictures.areOnScreenLoaded()) {
      this.#host.emit("waiting");
      this.#host.whenDrawable(() => this.#finish());
      return;
    }
    this.#host.draw();
    this.#host.emit("timeupdate");
    this.#host.onEnded();
  }
}
