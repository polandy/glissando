import { VideoPlaybackError, type LiveFrame, type VideoPlayback } from "./ports";
import type { Slide } from "./slideshow";
import { createClipPlan, type ClipTarget } from "./video-clip-plan";

export interface VideoClipsListeners {
  readonly onError: (error: Error) => void;
  /** A clip has a frame to draw that it did not have before. */
  readonly onFrameReady: () => void;
}

interface OpenClip {
  readonly playback: VideoPlayback;
  /** Playing since the last `play` or `restart`. */
  started: boolean;
  /** Where the clip was last put, so a paused clip is only seeked when the show moved it. */
  placedAtMs: number | null;
}

/**
 * The playbacks of a slideshow's video slides: opened lazily when a clip is near, driven from
 * the slide clock each frame (the clock leads, the clip follows) and released once its slide is
 * over (ADR-0035, `dev-docs/player/VIDEO_SLIDES.md`).
 */
export class VideoClips {
  readonly #plan: (timeMs: number) => readonly ClipTarget[];
  readonly #openVideo: (src: string, volume: number) => VideoPlayback;
  readonly #listeners: VideoClipsListeners;
  readonly #open = new Map<number, OpenClip>();
  readonly #readyChecks = new Set<() => void>();
  #playing = false;
  #failed = false;

  constructor(
    slides: readonly Slide[],
    openVideo: (src: string, volume: number) => VideoPlayback,
    listeners: VideoClipsListeners,
  ) {
    this.#plan = createClipPlan(slides);
    this.#openVideo = openVideo;
    this.#listeners = listeners;
  }

  /** Puts every clip near `timeMs` where the clock says, and releases those that are over. */
  place(timeMs: number): void {
    const targets = this.#plan(timeMs);
    const wanted = new Set(targets.map((target) => target.index));
    for (const [index, clip] of this.#open) {
      if (!wanted.has(index)) {
        clip.playback.dispose();
        this.#open.delete(index);
      }
    }
    for (const target of targets) {
      this.#placeClip(this.#clipFor(target), target);
    }
  }

  /**
   * Puts the clips at `timeMs` and resolves once those on screen there can play on without
   * stalling, so a show never starts its clock ahead of a clip that is still loading.
   */
  whenReady(timeMs: number): Promise<void> {
    if (this.isReady(timeMs)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const check = () => {
        if (this.isReady(timeMs)) {
          this.#readyChecks.delete(check);
          resolve();
        }
      };
      this.#readyChecks.add(check);
    });
  }

  /** Puts the clips at `timeMs` and tells whether those on screen there can play on. */
  isReady(timeMs: number): boolean {
    this.place(timeMs);
    return this.#plan(timeMs)
      .filter((target) => target.phase === "playing")
      .every((target) => this.#open.get(target.index)?.playback.isReady() === true);
  }

  /** Plays the clips on screen from `timeMs`; call it in the user's play gesture (Safari). */
  play(timeMs: number): void {
    this.#playing = true;
    this.place(timeMs);
  }

  pause(): void {
    this.#playing = false;
    for (const clip of this.#open.values()) {
      clip.started = false;
      clip.playback.pause();
    }
  }

  /** The show jumped: every clip is put at its new place by a hard seek, not a drift correction. */
  restart(): void {
    for (const clip of this.#open.values()) {
      clip.started = false;
      clip.placedAtMs = null;
    }
  }

  /** The clip frame of slide `index` if one is ready; the poster is drawn without. */
  frameAt(index: number): LiveFrame | undefined {
    return this.#open.get(index)?.playback.frame() ?? undefined;
  }

  dispose(): void {
    for (const clip of this.#open.values()) {
      clip.playback.dispose();
    }
    this.#open.clear();
    this.#readyChecks.clear();
  }

  /** A failed clip is reported once, however many paths notice it. */
  #report(error: Error): void {
    if (!this.#failed) {
      this.#failed = true;
      this.#listeners.onError(error);
    }
  }

  #clipFor({ index, video }: ClipTarget): OpenClip {
    const existing = this.#open.get(index);
    if (existing !== undefined) {
      return existing;
    }
    const playback = this.#openVideo(video.src, video.volume);
    playback.onFrameReady(() => {
      this.#listeners.onFrameReady();
      [...this.#readyChecks].forEach((check) => check());
    });
    playback.onFailure((error) => this.#report(error));
    const clip = { playback, started: false, placedAtMs: null };
    this.#open.set(index, clip);
    return clip;
  }

  #placeClip(clip: OpenClip, target: ClipTarget): void {
    const { playback } = clip;
    if (!this.#playing || target.phase === "waiting") {
      if (clip.placedAtMs !== target.clipMs) {
        playback.seek(target.clipMs);
      }
    } else if (clip.started) {
      playback.follow(target.clipMs);
    } else {
      clip.started = true;
      playback.play(target.clipMs).catch((cause: unknown) => {
        this.#report(new VideoPlaybackError(cause));
      });
    }
    clip.placedAtMs = target.clipMs;
    playback.setVolume(target.soundOn ? target.video.volume : 0);
  }
}
