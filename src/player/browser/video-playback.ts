import { VideoPlaybackError, type LiveFrame, type VideoPlayback } from "../ports";
import { ClipSoundTrack } from "./clip-sound-track";
import type { ClipSoundOutput } from "./music-output";

/** A clip further than this from where the slide clock puts it is seeked. */
export const VIDEO_SEEK_DRIFT_MS = 2000;
/** A clip closer than this to the clock plays at its normal rate. */
export const VIDEO_RATE_TOLERANCE_MS = 60;
/** Between the two, the clip catches up by playing faster or slower, which a seek would stall. */
const MIN_CATCH_UP_RATE = 0.8;
const MAX_CATCH_UP_RATE = 1.25;
const CATCH_UP_WINDOW_MS = 1000;

const MS_PER_SECOND = 1000;
/** Closer than this, the clip already is at the requested time. */
const SAME_TIME_MS = 1;
/**
 * A clip at most this far from its place when `play` starts it is not seeked: a start a frame or
 * two behind the clock is caught up by `follow`, but a seek right at the start is a visible hitch.
 */
export const VIDEO_START_TOLERANCE_MS = 250;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
/** What a media element's `play()` rejects with when a later `pause()` interrupts it. */
const INTERRUPTED_PLAY = "AbortError";
const READY_EVENTS = ["seeked", "loadeddata", "canplay", "playing"] as const;

/** The parts of the music output a clip's sound uses (ADR-0009). */
export interface VideoOutput {
  unlock(): void;
  /** Where the clip's decoded sound connects to and is scheduled from; null without Web Audio. */
  clipSoundOutput(): ClipSoundOutput | null;
}

/**
 * One clip played by an `HTMLVideoElement`, which also is the frame the renderers draw. The
 * element is always muted — iOS and iPadOS let only one media element with sound play at a time,
 * so an audible `<video>` would pause the music for the rest of the show (ADR-0035). The clip's
 * own sound, if any, plays through a `ClipSoundTrack` on the music's Web Audio context instead.
 */
export class VideoElementPlayback implements VideoPlayback {
  readonly #element: HTMLVideoElement;
  readonly #sound: ClipSoundTrack | null;
  readonly #sourceReady: Promise<void>;
  readonly #release: () => void;
  readonly #output: VideoOutput;
  readonly #listeners = new Set<() => void>();
  #wantedMs = 0;
  readonly #failureListeners = new Set<(error: Error) => void>();
  #hardSeekPending = false;
  #disposed = false;
  readonly #abort = new AbortController();

  /**
   * `sourceReady` settles when the element has its `src`; `release` frees what that took (an
   * object URL) on `dispose`. `decoded` is the clip's sound, if any, as `open-video.ts` starts
   * decoding it; `endMs` is the clip's own file-time clamp, past which its sound never plays.
   */
  constructor(
    element: HTMLVideoElement,
    volume: number,
    endMs: number,
    output: VideoOutput,
    decoded: Promise<AudioBuffer | null>,
    sourceReady: Promise<void>,
    release: () => void,
  ) {
    this.#element = element;
    this.#output = output;
    this.#sourceReady = sourceReady;
    this.#release = release;
    element.playsInline = true;
    element.preload = "auto";
    element.muted = true;
    this.#sound = volume > 0 ? new ClipSoundTrack(decoded, output.clipSoundOutput(), endMs) : null;
    this.#sound?.setVolume(volume);
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
    this.#sound?.stop();
    this.#element.playbackRate = 1;
    this.#hardSeekPending = true;
    this.#moveTo(clipMs);
  }

  async play(clipMs: number): Promise<void> {
    this.#output.unlock();
    this.#sound?.play(clipMs);
    this.#moveIfFarAway(clipMs, VIDEO_START_TOLERANCE_MS);
    try {
      await this.#sourceReady;
    } catch (error) {
      throw new VideoPlaybackError(error);
    }
    if (this.#disposed) {
      return;
    }
    try {
      // A muted play is always allowed: no gesture, no refusal to guard against.
      await this.#element.play();
    } catch (error) {
      // A pause before the start lands is not a refusal.
      if (error instanceof DOMException && error.name === INTERRUPTED_PLAY) {
        return;
      }
      throw new VideoPlaybackError(error);
    }
  }

  follow(clipMs: number): void {
    this.#sound?.follow(clipMs);
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
      this.#setRate(1);
      this.#moveTo(clipMs);
    } else if (Math.abs(aheadMs) > VIDEO_RATE_TOLERANCE_MS) {
      const rate = 1 - aheadMs / CATCH_UP_WINDOW_MS;
      this.#setRate(Math.min(MAX_CATCH_UP_RATE, Math.max(MIN_CATCH_UP_RATE, rate)));
    } else {
      this.#setRate(1);
    }
  }

  /** Avoids a redundant write: Safari fires a `ratechange` event even when the value is unchanged. */
  #setRate(rate: number): void {
    if (this.#element.playbackRate !== rate) {
      this.#element.playbackRate = rate;
    }
  }

  pause(): void {
    this.#sound?.stop();
    this.#element.pause();
  }

  setVolume(volume: number): void {
    this.#sound?.setVolume(volume);
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
    this.#sound?.dispose();
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
    return this.#moveIfFarAway(clipMs, SAME_TIME_MS);
  }

  /** Seeks unless the clip already is within `toleranceMs` of `clipMs`; tells whether it did. */
  #moveIfFarAway(clipMs: number, toleranceMs: number): boolean {
    this.#wantedMs = clipMs;
    if (Math.abs(this.#element.currentTime * MS_PER_SECOND - clipMs) <= toleranceMs) {
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
