import type { Clock, FrameScheduler, MusicPlayback } from "../ports";
import { MusicOutput, type MusicVolume } from "./music-output";
import { playingSecondsOf } from "./media-position";
import { DOM_EXCEPTION, isDomException } from "../../dom-exception/dom-exception";
import { MILLISECONDS_PER_SECOND } from "../slideshow";

export const performanceClock: Clock = { now: () => performance.now() };

export const animationFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(() => callback()),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/** Without Web Audio: the element's own volume, which iOS ignores. */
const elementVolumeOnly = () => null;

/**
 * A song standing this close to its place when it starts is not seeked: one resumed after a hold
 * is within a frame of it, and the seek itself would be heard as a gap while it buffers again.
 */
const MUSIC_START_TOLERANCE_MS = 50;

/**
 * Plays a music file through `output`; without one, at the element's own volume. `play` unlocks
 * the output, so a `play` within a user gesture also lets Web Audio sound on iOS.
 */
export class AudioElementMusic implements MusicPlayback {
  readonly #audio: HTMLAudioElement;
  readonly #output: MusicOutput;
  readonly #volume: MusicVolume;

  constructor(src: string, output: MusicOutput = new MusicOutput(elementVolumeOnly)) {
    this.#audio = new Audio(src);
    this.#audio.preload = "auto";
    this.#output = output;
    this.#volume = output.route(this.#audio);
  }

  play(atSeconds: number): Promise<void> {
    this.#output.unlock();
    const offPlaceMs = Math.abs(this.#audio.currentTime - atSeconds) * MILLISECONDS_PER_SECOND;
    if (offPlaceMs > MUSIC_START_TOLERANCE_MS) {
      this.#audio.currentTime = atSeconds;
    }
    // A pause before the start lands (a quick seek pauses and plays again) is not a refusal.
    return this.#audio.play().catch((error: unknown) => {
      if (!isDomException(error, DOM_EXCEPTION.aborted)) {
        throw error;
      }
    });
  }

  setVolume(volume: number): void {
    this.#volume.set(volume);
  }

  playingSeconds(): number | null {
    return playingSecondsOf(this.#audio);
  }

  seek(atSeconds: number): void {
    this.#audio.currentTime = atSeconds;
  }

  pause(): void {
    this.#audio.pause();
  }

  dispose(): void {
    this.#volume.dispose();
    this.#audio.pause();
    this.#audio.removeAttribute("src");
    this.#audio.load();
  }
}

/** The `navigator.audioSession` of Safari 16.4 and later, missing from the DOM types. */
interface AudioSessionNavigator {
  readonly audioSession?: { type: string };
}

/** iOS mutes Web Audio under the ring/silent switch unless the session says it plays media. */
const MEDIA_PLAYBACK_SESSION = "playback";

/** The page's Web Audio context for the music; null where the browser has no Web Audio. */
export function createMusicAudioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") {
    return null;
  }
  const { audioSession } = navigator as AudioSessionNavigator;
  if (audioSession !== undefined) {
    audioSession.type = MEDIA_PLAYBACK_SESSION;
  }
  return new AudioContext();
}
