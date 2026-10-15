import { VideoPlaybackError, type LiveFrame, type VideoPlayback } from "../ports";
import type { MusicVolume } from "./music-output";

/** A clip further than this from where the slide clock puts it is seeked; closer, it plays on. */
export const VIDEO_DRIFT_MS = 250;

const MS_PER_SECOND = 1000;
/** Closer than this, the clip already is at the requested time. */
const SAME_TIME_MS = 1;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
/** What a media element's `play()` rejects with when a later `pause()` interrupts it. */
const INTERRUPTED_PLAY = "AbortError";
const READY_EVENTS = ["seeked", "loadeddata", "playing"] as const;

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
  #hardSeekPending = false;

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
    element.addEventListener("seeked", () => {
      this.#hardSeekPending = false;
    });
    element.addEventListener("loadedmetadata", () => this.#applyWanted());
    for (const type of READY_EVENTS) {
      element.addEventListener(type, () => this.#listeners.forEach((listener) => listener()));
    }
  }

  seek(clipMs: number): void {
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
    try {
      await this.#element.play();
    } catch (error) {
      // A pause before the start lands is not a refusal.
      if (!(error instanceof DOMException && error.name === INTERRUPTED_PLAY)) {
        throw new VideoPlaybackError(error);
      }
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
    const driftMs = Math.abs(this.#element.currentTime * MS_PER_SECOND - clipMs);
    if (driftMs > VIDEO_DRIFT_MS) {
      this.#moveTo(clipMs);
    }
  }

  pause(): void {
    this.#element.pause();
  }

  setVolume(volume: number): void {
    this.#volume?.set(volume);
  }

  frame(): LiveFrame | null {
    return this.#hardSeekPending || this.#element.readyState < HAVE_CURRENT_DATA
      ? null
      : this.#element;
  }

  onFrameReady(listener: () => void): void {
    this.#listeners.add(listener);
  }

  dispose(): void {
    this.#listeners.clear();
    this.#volume?.dispose();
    this.#element.pause();
    this.#element.removeAttribute("src");
    this.#element.load();
    this.#release();
  }

  #moveIfAway(clipMs: number): void {
    this.#wantedMs = clipMs;
    if (Math.abs(this.#element.currentTime * MS_PER_SECOND - clipMs) > SAME_TIME_MS) {
      this.#element.currentTime = clipMs / MS_PER_SECOND;
    }
  }

  #moveTo(clipMs: number): void {
    this.#wantedMs = clipMs;
    this.#element.currentTime = clipMs / MS_PER_SECOND;
  }

  #applyWanted(): void {
    this.#moveIfAway(this.#wantedMs);
  }
}
