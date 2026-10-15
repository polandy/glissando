import {
  resetVideoClip,
  setVideoDuckMusic,
  setVideoExcerpt,
  setVideoVolume,
} from "../../library/slideshow-edits-video";
import type { StoredSlideshow } from "../../library/stored-slideshow";

/** A video slide's clip settings (ADR-0034): each applies at once, through the owning editor. */
export class VideoSettingsEditor {
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(current: () => StoredSlideshow, apply: (slideshow: StoredSlideshow) => void) {
    this.#current = current;
    this.#apply = apply;
  }

  /** Plays the clip from `startMs` to `endMs`, which is then the slide's duration. */
  setExcerpt(pictureId: string, startMs: number, endMs: number): void {
    this.#apply(setVideoExcerpt(this.#current(), pictureId, startMs, endMs));
  }

  /** 0 to 100 in steps of 5; 0 is sound off. */
  setVolume(pictureId: string, volume: number): void {
    this.#apply(setVideoVolume(this.#current(), pictureId, volume));
  }

  setDuckMusic(pictureId: string, duckMusic: boolean): void {
    this.#apply(setVideoDuckMusic(this.#current(), pictureId, duckMusic));
  }

  /** The clip as import made it. */
  reset(pictureId: string): void {
    this.#apply(resetVideoClip(this.#current(), pictureId));
  }
}
