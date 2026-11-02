import type { Size } from "./ken-burns";
import { PlayerVideo } from "./player-video";
import { PlaylistMusic } from "./playlist-music";
import { MusicPlaybackError, type PlayerDependencies } from "./ports";
import type { Slideshow } from "./slideshow";
import { duckFactorFor } from "./video-duck";

export interface PlayerMediaListeners {
  /** The browser refused to play the music or a clip (`MusicPlaybackError`, `VideoPlaybackError`). */
  readonly onError: (error: Error) => void;
  /** A clip has a frame to draw that it did not have before. */
  readonly onFrameReady: () => void;
}

/**
 * What plays alongside the slides: the music, ducked while a clip with sound plays, and the
 * clips of the video slides (ADR-0023, ADR-0035). Each part is absent without its dependency
 * or its content.
 */
export class PlayerMedia {
  readonly #music: PlaylistMusic | null;
  /** The video slides' live frames for the renderer; null without a clip to play. */
  readonly video: PlayerVideo | null;
  readonly #listeners: PlayerMediaListeners;

  constructor(
    slideshow: Slideshow,
    dependencies: Pick<PlayerDependencies<Size>, "openMusic" | "openVideo" | "openVideoFrames">,
    listeners: PlayerMediaListeners,
  ) {
    this.#listeners = listeners;
    this.#music =
      slideshow.music === undefined || dependencies.openMusic === undefined
        ? null
        : new PlaylistMusic(
            slideshow.music,
            dependencies.openMusic,
            duckFactorFor(slideshow.slides),
          );
    this.video = PlayerVideo.of(slideshow, dependencies, listeners);
  }

  /** Call it in the user's play gesture. */
  play(timeMs: number): void {
    this.#music?.play(timeMs).catch((cause: unknown) => this.#failMusic(cause));
    this.video?.play(timeMs);
  }

  follow(timeMs: number): void {
    this.#music?.follow(timeMs).catch((cause: unknown) => this.#failMusic(cause));
  }

  pause(): void {
    this.#music?.pause();
    this.video?.pause();
  }

  /** The music rises from silence over a second from `timeMs`, until the show next jumps. */
  fadeMusicInFrom(timeMs: number): void {
    this.#music?.fadeInFrom(timeMs);
  }

  /** The music is at full volume again, whatever fade-in was running. */
  endMusicFadeIn(): void {
    this.#music?.clearFadeIn();
  }

  /** The show jumped to a new time. */
  restart(): void {
    this.endMusicFadeIn();
    this.video?.restart();
  }

  /** Decodes the frames the export needs at `timeMs`; resolves at once without a frame source. */
  load(timeMs: number): Promise<void> {
    return this.video?.load(timeMs) ?? Promise.resolve();
  }

  dispose(): void {
    this.#music?.dispose();
    this.video?.dispose();
  }

  #failMusic(cause: unknown): void {
    this.#listeners.onError(new MusicPlaybackError(cause));
  }
}
