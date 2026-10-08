import type { Clock, FrameScheduler, MusicPlayback } from "../ports";

export const performanceClock: Clock = { now: () => performance.now() };

export const animationFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(() => callback()),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export class AudioElementMusic implements MusicPlayback {
  readonly #audio: HTMLAudioElement;

  constructor(src: string) {
    this.#audio = new Audio(src);
    this.#audio.preload = "auto";
  }

  play(atSeconds: number): Promise<void> {
    this.#audio.currentTime = atSeconds;
    return this.#audio.play();
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
