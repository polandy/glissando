import type { Clock, FrameScheduler, MusicPlayback } from "../ports";

export const performanceClock: Clock = { now: () => performance.now() };

export const animationFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(() => callback()),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/** What a media element's `play()` rejects with when a later `pause()` interrupts it. */
const INTERRUPTED_PLAY = "AbortError";

export class AudioElementMusic implements MusicPlayback {
  readonly #audio: HTMLAudioElement;

  constructor(src: string) {
    this.#audio = new Audio(src);
    this.#audio.preload = "auto";
  }

  play(atSeconds: number): Promise<void> {
    this.#audio.currentTime = atSeconds;
    // A pause before the start lands (a quick seek pauses and plays again) is not a refusal.
    return this.#audio.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === INTERRUPTED_PLAY)) {
        throw error;
      }
    });
  }

  setVolume(volume: number): void {
    this.#audio.volume = volume;
  }

  pause(): void {
    this.#audio.pause();
  }

  dispose(): void {
    this.#audio.pause();
    this.#audio.removeAttribute("src");
    this.#audio.load();
  }
}
