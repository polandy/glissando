import { VideoPlaybackError, type LiveFrame, type VideoPlayback } from "../ports";
import type { MusicVolume } from "./music-output";

/** A clip further than this from where the slide clock puts it is seeked. */
export const VIDEO_SEEK_DRIFT_MS = 2000;
/** A clip closer than this to the clock plays at its normal rate. */
export const VIDEO_RATE_TOLERANCE_MS = 60;
/** Between the two, a clip catches up by playing faster or slower, which a seek would stall. */
const MIN_CATCH_UP_RATE = 0.8;
const MAX_CATCH_UP_RATE = 1.25;
const CATCH_UP_WINDOW_MS = 1000;

const MS_PER_SECOND = 1000;
/** Closer than this, the clip already is at the requested time. */
const SAME_TIME_MS = 1;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
/** What a media element's `play()` rejects with when a later `pause()` interrupts it. */
const INTERRUPTED_PLAY = "AbortError";
/** What WebKit rejects an audible `play()` with outside a gesture-blessed element (ADR-0035). */
const NOT_ALLOWED = "NotAllowedError";
const READY_EVENTS = ["seeked", "loadeddata", "canplay", "playing"] as const;

/** The parts of the music output a clip's sound uses (ADR-0009). */
export interface VideoOutput {
  unlock(): void;
  route(element: HTMLVideoElement): MusicVolume;
}

/**
 * One clip played by an `HTMLVideoElement`, which also is the frame the renderers draw. A clip
 * with volume 0 is muted for good; one with volume is never muted, so Safari keeps its sound
 * allowed by the gesture that started the show.
 */
export class VideoElementPlayback implements VideoPlayback {
  readonly #element: HTMLVideoElement;
  readonly #volume: MusicVolume | null;
  readonly #sourceReady: Promise<void>;
  readonly #release: () => void;
  readonly #output: VideoOutput;
  readonly #listeners = new Set<() => void>();
  #wantedMs = 0;
  readonly #failureListeners = new Set<(error: Error) => void>();
  #hardSeekPending = false;
  #disposed = false;
  readonly #abort = new AbortController();
  /** Set once the safety net mutes a clip the browser refused to play aloud; stays muted for good. */
  #safetyMuted = false;

  /**
   * `sourceReady` settles when the element has its `src`; `release` frees what that took (an
   * object URL) on `dispose`.
   */
  constructor(
    element: HTMLVideoElement,
    volume: number,
    output: VideoOutput,
    sourceReady: Promise<void>,
    release: () => void,
  ) {
    this.#element = element;
    this.#output = output;
    this.#sourceReady = sourceReady;
    this.#release = release;
    element.playsInline = true;
    element.preload = "auto";
    element.muted = volume === 0;
    this.#volume = element.muted ? null : output.route(element);
    this.#volume?.set(volume);
    const { signal } = this.#abort;
    element.addEventListener(
      "seeked",
      () => {
        this.#hardSeekPending = false;
      },
      { signal },
    );
    element.addEventListener("loadedmetadata", () => this.#applyWanted(), { signal });
    element.addEventListener("error", () => this.#fail(element.error), { signal });
    sourceReady.catch((cause: unknown) => this.#fail(cause));
    for (const type of READY_EVENTS) {
      element.addEventListener(type, () => this.#listeners.forEach((listener) => listener()), {
        signal,
      });
    }
  }

  seek(clipMs: number): void {
    this.#element.playbackRate = 1;
    this.#hardSeekPending = true;
    this.#moveTo(clipMs);
  }

  async play(clipMs: number): Promise<void> {
    this.#output.unlock();
    this.#moveIfAway(clipMs);
    try {
      await this.#sourceReady;
    } catch (error) {
      throw new VideoPlaybackError(error);
    }
    if (this.#disposed) {
      return;
    }
    try {
      await this.#element.play();
    } catch (error) {
      // A pause before the start lands is not a refusal.
      if (error instanceof DOMException && error.name === INTERRUPTED_PLAY) {
        return;
      }
      if (!this.#element.muted && error instanceof DOMException && error.name === NOT_ALLOWED) {
        // WebKit refused this element's sound outside a blessed gesture (ADR-0035): the show goes
        // on without it rather than stopping on every video slide.
        console.warn("muting a video clip WebKit refused to play aloud", error);
        this.#safetyMuted = true;
        this.#element.muted = true;
        try {
          await this.#element.play();
          return;
        } catch (retryError) {
          throw new VideoPlaybackError(retryError);
        }
      }
      throw new VideoPlaybackError(error);
    }
  }

  follow(clipMs: number): void {
    // Until it really plays, a clip lags the clock only by its start-up; a seek then would restart
    // that start-up and make the clip stutter.
    if (
      this.#element.seeking ||
      this.#element.paused ||
      this.#element.readyState < HAVE_FUTURE_DATA
    ) {
      return;
    }
    const aheadMs = this.#element.currentTime * MS_PER_SECOND - clipMs;
    if (Math.abs(aheadMs) > VIDEO_SEEK_DRIFT_MS) {
      this.#element.playbackRate = 1;
      this.#moveTo(clipMs);
    } else if (Math.abs(aheadMs) > VIDEO_RATE_TOLERANCE_MS) {
      const rate = 1 - aheadMs / CATCH_UP_WINDOW_MS;
      this.#element.playbackRate = Math.min(MAX_CATCH_UP_RATE, Math.max(MIN_CATCH_UP_RATE, rate));
    } else {
      this.#element.playbackRate = 1;
    }
  }

  pause(): void {
    this.#element.pause();
  }

  setVolume(volume: number): void {
    this.#volume?.set(volume);
    // The safety net's mute is for this clip's whole life: a later volume never lifts it.
    if (this.#safetyMuted) {
      this.#element.muted = true;
    }
  }

  frame(): LiveFrame | null {
    return this.#hardSeekPending || this.#element.readyState < HAVE_CURRENT_DATA
      ? null
      : this.#element;
  }

  isReady(): boolean {
    return !this.#element.seeking && this.#element.readyState >= HAVE_FUTURE_DATA;
  }

  onFrameReady(listener: () => void): void {
    this.#listeners.add(listener);
  }

  onFailure(listener: (error: Error) => void): void {
    this.#failureListeners.add(listener);
  }

  dispose(): void {
    this.#disposed = true;
    this.#abort.abort();
    this.#listeners.clear();
    this.#failureListeners.clear();
    this.#volume?.dispose();
    this.#element.pause();
    this.#element.removeAttribute("src");
    this.#element.load();
    this.#release();
  }

  #fail(cause: unknown): void {
    const error = new VideoPlaybackError(cause);
    this.#failureListeners.forEach((listener) => listener(error));
  }

  /** Seeks unless the clip already is at `clipMs`; tells whether it did. */
  #moveIfAway(clipMs: number): boolean {
    this.#wantedMs = clipMs;
    if (Math.abs(this.#element.currentTime * MS_PER_SECOND - clipMs) <= SAME_TIME_MS) {
      return false;
    }
    this.#element.currentTime = clipMs / MS_PER_SECOND;
    return true;
  }

  #moveTo(clipMs: number): void {
    this.#wantedMs = clipMs;
    this.#element.currentTime = clipMs / MS_PER_SECOND;
  }

  #applyWanted(): void {
    if (!this.#moveIfAway(this.#wantedMs)) {
      // No seek happens, so no `seeked` comes to end the wait for the requested place.
      this.#hardSeekPending = false;
    }
  }
}
