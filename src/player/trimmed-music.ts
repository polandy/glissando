import { isMusicHeardAt, musicGainAt, musicTrackSeconds } from "./music-gain";
import type { MusicPlayback } from "./ports";
import type { Music } from "./slideshow";

/**
 * Plays the music's excerpt along slideshow time: from its start, at the volume of its fade
 * envelope, and not at all once it is no longer heard. See ADR-0009.
 */
export class TrimmedMusic {
  readonly #music: Music;
  readonly #playback: MusicPlayback;
  #sounding = false;

  constructor(music: Music, playback: MusicPlayback) {
    this.#music = music;
    this.#playback = playback;
  }

  /** Plays from slideshow time `timeMs`; stays silent past the music's end. */
  play(timeMs: number): Promise<void> {
    if (!isMusicHeardAt(this.#music, timeMs)) {
      return Promise.resolve();
    }
    this.#playback.setVolume(musicGainAt(this.#music, timeMs));
    this.#sounding = true;
    return this.#playback.play(musicTrackSeconds(this.#music, timeMs));
  }

  /** Follows the envelope to slideshow time `timeMs`, pausing once the music is over. */
  follow(timeMs: number): void {
    if (!this.#sounding) {
      return;
    }
    if (isMusicHeardAt(this.#music, timeMs)) {
      this.#playback.setVolume(musicGainAt(this.#music, timeMs));
    } else {
      this.pause();
    }
  }

  /** Pauses the music if it is sounding. */
  pause(): void {
    if (this.#sounding) {
      this.#sounding = false;
      this.#playback.pause();
    }
  }

  dispose(): void {
    this.#sounding = false;
    this.#playback.dispose();
  }
}
