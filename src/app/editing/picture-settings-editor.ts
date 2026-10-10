import { pictureKenBurns } from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import type { PictureFocus } from "../../library/picture-focus";
import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";
import {
  setPictureDuration,
  setPictureKenBurns,
  setPictureTransition,
  setSlideshowTransition,
} from "../../library/slideshow-edits";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { ResetUndo } from "./reset-undo";

/** What `PictureSettingsEditor` needs from the screen to word its undo toasts. */
export interface PictureSettingsPorts {
  /** The picture's focus as known now; the automatic motion aims at it. */
  readonly focusOf: (pictureId: string) => PictureFocus | undefined;
  readonly motionAutomaticText: () => string;
  readonly durationAutomaticText: () => string;
  readonly transitionAutomaticText: () => string;
  readonly slideshowTransitionResetText: () => string;
}

/**
 * A picture's own Ken Burns motion, duration and transition, and the slideshow's default
 * transition: each applies at once, through the `SlideshowEditor` that owns this instance. Drops
 * ask nothing; the toast's undo brings the setting back (`ResetUndo`).
 */
export class PictureSettingsEditor {
  readonly #ports: PictureSettingsPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: PictureSettingsPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  /**
   * The picture plays `kenBurns` from now on, wherever it moves. It ends a pending undo of
   * that picture's reset, which would otherwise overwrite this newer motion.
   */
  setKenBurns(pictureId: string, kenBurns: OwnKenBurns): void {
    this.#reset.supersede(pictureId, "kenBurns");
    this.#apply(setPictureKenBurns(this.#current(), pictureId, kenBurns));
  }

  /** Drops the picture's own motion without asking; the toast's undo brings it back. */
  resetKenBurns(pictureId: string): void {
    const previous = this.#picture(pictureId).kenBurns;
    if (previous === undefined) {
      return;
    }
    this.#apply(setPictureKenBurns(this.#current(), pictureId, undefined));
    this.#offerUndo(pictureId, "kenBurns", this.#ports.motionAutomaticText(), () =>
      this.setKenBurns(pictureId, previous),
    );
  }

  /** The picture shows `durationMs` (validated) from now on, wherever it moves. */
  setDuration(pictureId: string, durationMs: number): void {
    this.#reset.supersede(pictureId, "durationMs");
    this.#apply(setPictureDuration(this.#current(), pictureId, durationMs));
  }

  /** Makes the picture's duration automatic without asking; the toast's undo brings it back. */
  resetDuration(pictureId: string): void {
    const previous = this.#picture(pictureId).durationMs;
    if (previous === undefined) {
      return;
    }
    this.#apply(setPictureDuration(this.#current(), pictureId, undefined));
    this.#offerUndo(pictureId, "durationMs", this.#ports.durationAutomaticText(), () =>
      this.setDuration(pictureId, previous),
    );
  }

  /** The picture hands over to the next one with `transition` from now on, wherever it moves. */
  setTransition(pictureId: string, transition: TransitionChoice): void {
    this.#reset.supersede(pictureId, "transition");
    this.#apply(setPictureTransition(this.#current(), pictureId, transition));
  }

  /** Makes the picture's transition automatic without asking; the toast's undo brings it back. */
  resetTransition(pictureId: string): void {
    const previous = this.#picture(pictureId).transition;
    if (previous === undefined) {
      return;
    }
    this.#apply(setPictureTransition(this.#current(), pictureId, undefined));
    this.#offerUndo(pictureId, "transition", this.#ports.transitionAutomaticText(), () =>
      this.setTransition(pictureId, previous),
    );
  }

  /** Every picture without its own transition hands over with `transition` from now on. */
  setSlideshowTransition(transition: SlideshowTransition): void {
    this.#reset.supersede(this.#current().id, "slideshowTransition");
    this.#apply(setSlideshowTransition(this.#current(), transition));
  }

  /** Returns the default to crossfade without asking; the toast's undo brings it back. */
  resetSlideshowTransition(): void {
    const slideshow = this.#current();
    const previous = slideshow.transition;
    if (previous === undefined) {
      return;
    }
    this.#apply(setSlideshowTransition(slideshow, undefined));
    this.#reset.offer(
      slideshow.id,
      "slideshowTransition",
      this.#ports.slideshowTransitionResetText(),
      () => this.setSlideshowTransition(previous),
    );
  }

  /** Reverses the picture's motion; an automatic one becomes the picture's own. */
  swapKenBurns(pictureId: string): void {
    const slideshow = this.#current();
    const index = slideshow.pictures.findIndex((picture) => picture.id === pictureId);
    const { from, to } = pictureKenBurns(
      index,
      this.#picture(pictureId),
      this.#ports.focusOf(pictureId),
    );
    this.setKenBurns(pictureId, { from: to, to: from });
  }

  /** The undo of a reset; a picture removed meanwhile has nothing to bring back. */
  #offerUndo(
    pictureId: string,
    setting: "kenBurns" | "durationMs" | "transition",
    text: string,
    restore: () => void,
  ): void {
    this.#reset.offer(pictureId, setting, text, () => {
      if (this.#current().pictures.some((picture) => picture.id === pictureId)) {
        restore();
      }
    });
  }

  #picture(pictureId: string) {
    const slideshow = this.#current();
    const picture = slideshow.pictures.find((candidate) => candidate.id === pictureId);
    if (picture === undefined) {
      throw new Error(`slideshow "${slideshow.id}" holds no picture "${pictureId}"`);
    }
    return picture;
  }
}
