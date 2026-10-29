import type { MusicPlayback } from "./ports";

/**
 * Music that opens only when first played. A screen that may never play (the music editor
 * until "Listen") then loads no audio, and starts no media pipeline, just by showing a song:
 * WebKit can hang the whole page when a routed audio element starts loading while it is busy.
 */
export class DeferredMusic implements MusicPlayback {
  readonly #open: () => MusicPlayback;
  #music: MusicPlayback | null = null;
  #volume: number | undefined;

  constructor(open: () => MusicPlayback) {
    this.#open = open;
  }

  play(atSeconds: number): Promise<void> {
    if (this.#music === null) {
      this.#music = this.#open();
      if (this.#volume !== undefined) this.#music.setVolume(this.#volume);
    }
    return this.#music.play(atSeconds);
  }

  setVolume(volume: number): void {
    this.#volume = volume;
    this.#music?.setVolume(volume);
  }

  pause(): void {
    this.#music?.pause();
  }

  dispose(): void {
    this.#music?.dispose();
  }
}
