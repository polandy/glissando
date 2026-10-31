import {
  resetVideoClip,
  setVideoDuckMusic,
  setVideoExcerpt,
  setVideoVolume,
} from "../../library/slideshow-edits-video";
import type { StoredVideo } from "../../library/own-video";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { ResetUndo } from "./reset-undo";

/** What `VideoSettingsEditor` needs from the screen to word its undo toast. */
export interface VideoSettingsPorts {
  /** The undo toast's text after a clip's settings were reset. */
  readonly clipResetText: () => string;
}

/** A video slide's clip settings (ADR-0034): each applies at once, through the owning editor; the reset's toast offers an undo (`ResetUndo`). */
export class VideoSettingsEditor {
  readonly #ports: VideoSettingsPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: VideoSettingsPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  /** Plays the clip from `startMs` to `endMs`, which is then the slide's duration. */
  setExcerpt(pictureId: string, startMs: number, endMs: number): void {
    this.#supersede(pictureId);
    this.#apply(setVideoExcerpt(this.#current(), pictureId, startMs, endMs));
  }

  /** 0 to 100 in steps of 5; 0 is sound off. */
  setVolume(pictureId: string, volume: number): void {
    this.#supersede(pictureId);
    this.#apply(setVideoVolume(this.#current(), pictureId, volume));
  }

  setDuckMusic(pictureId: string, duckMusic: boolean): void {
    this.#supersede(pictureId);
    this.#apply(setVideoDuckMusic(this.#current(), pictureId, duckMusic));
  }

  /** The clip as import made it. */
  reset(pictureId: string): void {
    const slideshow = this.#current();
    const previous = slideshow.pictures.find((picture) => picture.id === pictureId)?.video;
    this.#apply(resetVideoClip(slideshow, pictureId));
    if (previous === undefined) {
      return;
    }
    this.#reset.offer(pictureId, "videoClip", this.#ports.clipResetText(), () =>
      this.#restore(pictureId, previous),
    );
  }

  #restore(pictureId: string, video: StoredVideo): void {
    const slideshow = this.#current();
    this.#apply({
      ...slideshow,
      pictures: slideshow.pictures.map((picture) =>
        picture.id === pictureId ? { ...picture, video } : picture,
      ),
    });
  }

  #supersede(pictureId: string): void {
    this.#reset.supersede(pictureId, "videoClip");
  }
}
