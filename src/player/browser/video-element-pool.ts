import type { MusicVolume } from "./music-output";
import type { VideoOutput } from "./video-playback";

/**
 * Clips held open at once (`video-clip-plan.ts`): the one on screen, the one transitioning out,
 * and the next already preloading within `VIDEO_PRELOAD_MS`. The pool keeps this many elements
 * blessed so iOS lets their sound play later, without a fresh gesture for every clip (ADR-0035).
 */
export const VIDEO_POOL_SIZE = 3;

const defaultCreateElement = (): HTMLVideoElement => document.createElement("video");

/**
 * A page-wide pool of `<video>` elements. WebKit on iOS allows a media element's audible
 * `play()` only once that very element has played inside a user gesture; pooling lets the show
 * bless a handful of elements once, in the gesture that starts or resumes it, and keep reusing
 * them for the later clips the slide clock starts on its own. Exhausted, `acquire` falls back to
 * a fresh, un-blessed element; `VideoElementPlayback`'s safety net covers its sound being refused.
 */
export class VideoElementPool {
  readonly #createElement: () => HTMLVideoElement;
  readonly #size: number;
  readonly #members = new Set<HTMLVideoElement>();
  readonly #idle: HTMLVideoElement[] = [];
  readonly #blessed = new Set<HTMLVideoElement>();
  readonly #volumes = new Map<HTMLVideoElement, MusicVolume>();

  constructor(
    size: number = VIDEO_POOL_SIZE,
    createElement: () => HTMLVideoElement = defaultCreateElement,
  ) {
    this.#size = size;
    this.#createElement = createElement;
  }

  /**
   * Blesses every idle pooled element for later audible play: `play()` then, synchronously,
   * `pause()` — WebKit counts that even though there is no source yet to actually play. Call
   * this inside the same user gesture that starts or resumes the show.
   */
  unlock(): void {
    while (this.#members.size < this.#size) {
      this.#addMember();
    }
    for (const element of this.#idle) {
      this.#blessOnce(element);
    }
  }

  /** Hands out an idle pooled element, blessed if `unlock` ran; past the pool's size, a fresh one. */
  acquire(): HTMLVideoElement {
    const idle = this.#idle.shift();
    if (idle !== undefined) {
      return idle;
    }
    // Not exhausted yet, just never unlocked: still worth tracking for reuse and routing.
    if (this.#members.size < this.#size) {
      const element = this.#createElement();
      this.#members.add(element);
      return element;
    }
    return this.#createElement();
  }

  /** Returns a pooled `element` to the idle set, silent at the speakers until its next clip plays. */
  release(element: HTMLVideoElement): void {
    if (!this.#members.has(element)) {
      return;
    }
    this.#volumes.get(element)?.set(0);
    this.#idle.push(element);
  }

  /**
   * Routes `element` to Web Audio through `output`, once: `createMediaElementSource` throws on a
   * second call for the same element, so a pooled element's `MusicVolume` is cached and handed
   * back to every later clip that reuses it. An element outside the pool is never reused, so it
   * is routed directly.
   */
  routeOnce(element: HTMLVideoElement, output: VideoOutput): MusicVolume {
    if (!this.#members.has(element)) {
      return output.route(element);
    }
    const cached = this.#volumes.get(element);
    if (cached !== undefined) {
      return cached;
    }
    const real = output.route(element);
    // Disconnecting on release would break the reuse `routeOnce` exists for; `release` mutes instead.
    const kept: MusicVolume = { set: (volume) => real.set(volume), dispose: () => undefined };
    this.#volumes.set(element, kept);
    return kept;
  }

  #addMember(): void {
    const element = this.#createElement();
    this.#members.add(element);
    this.#idle.push(element);
  }

  #blessOnce(element: HTMLVideoElement): void {
    if (this.#blessed.has(element)) {
      return;
    }
    this.#blessed.add(element);
    const played = element.play();
    element.pause();
    // No source yet, so WebKit rejects with AbortError: expected, and of no interest to the pool.
    played.catch(() => undefined);
  }
}
