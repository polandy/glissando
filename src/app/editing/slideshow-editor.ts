import { pictureKenBurns } from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import type { MusicTrim } from "../../library/own-music";
import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";
import {
  movePicture,
  removePicture,
  renameSlideshow,
  restorePictures,
  setMusicFadeIn,
  setMusicFadeOut,
  setMusicTrim,
  setPictureCaption,
  setPictureDuration,
  setPictureKenBurns,
  setPictureTransition,
  setSlideshowTransition,
} from "../../library/slideshow-edits";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import type { Toaster } from "../toast/toaster";
import { EditSaver } from "./edit-saver";
import { RemovalUndo } from "./removal-undo";
import { ResetUndo, type ResettableSetting } from "./reset-undo";

export interface SlideshowEditorPorts {
  readonly store: Pick<LibraryStore, "updateSlideshow" | "claimMedia" | "releaseClaim">;
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  /** A new id for the claim that spares removed pictures' media while they can be undone. */
  readonly newId: () => string;
  readonly now: () => Date;
  readonly onError: (error: unknown) => void;
  /** The slideshow was deleted meanwhile, e.g. in another tab; edits are no longer stored. */
  readonly onGone: () => void;
  /** The undo toast's text for `count` pictures removed. */
  readonly removedText: (count: number) => string;
  readonly undoLabel: () => string;
  /** Why the last picture stays, and how to discard the whole slideshow instead. */
  readonly lastPictureText: () => string;
  /** The undo toast's text after a picture's own motion was dropped. */
  readonly motionAutomaticText: () => string;
  /** The undo toast's text after a picture's own duration was dropped. */
  readonly durationAutomaticText: () => string;
  /** The undo toast's text after a picture's own transition was dropped. */
  readonly transitionAutomaticText: () => string;
  /** The undo toast's text after the slideshow's default transition went back to crossfade. */
  readonly slideshowTransitionResetText: () => string;
  /** The title from the capture dates, which an emptied title falls back to. */
  readonly automaticTitle: (slideshow: StoredSlideshow) => string;
}

/**
 * The slideshow screen's edits: each applies at once and is stored. Removing needs no
 * confirmation; its toast undoes every removal made while it is shown, and any other edit
 * ends that batch, so an undo never puts pictures back at positions that shifted meanwhile.
 * While the toast is shown, the removed pictures' media is claimed, so a clean-up in any tab
 * spares it.
 */
export class SlideshowEditor {
  readonly #ports: SlideshowEditorPorts;
  readonly #listeners = new Set<(slideshow: StoredSlideshow) => void>();
  #slideshow: StoredSlideshow;
  readonly #removalUndo: RemovalUndo;
  readonly #resetUndo: ResetUndo;
  readonly #saver: EditSaver;

  constructor(initial: StoredSlideshow, ports: SlideshowEditorPorts) {
    this.#slideshow = initial;
    this.#ports = ports;
    this.#resetUndo = new ResetUndo(ports.toaster, ports.undoLabel);
    this.#saver = new EditSaver({
      store: ports.store,
      onError: ports.onError,
      onGone: () => {
        this.#removalUndo.end();
        ports.onGone();
      },
    });
    this.#removalUndo = new RemovalUndo({
      ...ports,
      track: (work) => this.#saver.track(work),
    });
  }

  get slideshow(): StoredSlideshow {
    return this.#slideshow;
  }

  /** Called with every edit; returns the unsubscribe function. */
  subscribe(listener: (slideshow: StoredSlideshow) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** See `EditSaver.subscribeSaving`. */
  subscribeSaving(listener: (saving: boolean) => void): () => void {
    return this.#saver.subscribeSaving(listener);
  }

  /** The last picture stays; asking to remove it explains why in a toast. */
  remove(pictureId: string): void {
    if (this.#slideshow.pictures.length < 2) {
      this.#ports.toaster.show({ text: this.#ports.lastPictureText(), tone: "info" });
      return;
    }
    const { slideshow, removed } = removePicture(this.#slideshow, pictureId);
    this.#removalUndo.add(removed, (removals) =>
      this.#apply(restorePictures(this.#slideshow, removals)),
    );
    this.#apply(slideshow);
  }

  move(pictureId: string, toIndex: number): void {
    const moved = movePicture(this.#slideshow, pictureId, toIndex);
    if (moved !== this.#slideshow) {
      this.#removalUndo.end();
      this.#apply(moved);
    }
  }

  rename(typed: string): void {
    const automatic = this.#ports.automaticTitle(this.#slideshow);
    this.#apply(renameSlideshow(this.#slideshow, typed, automatic));
  }

  /**
   * The picture plays `kenBurns` from now on, wherever it moves. It ends a pending undo of
   * that picture's reset, which would otherwise overwrite this newer motion.
   */
  setKenBurns(pictureId: string, kenBurns: OwnKenBurns): void {
    this.#resetUndo.supersede(pictureId, "kenBurns");
    this.#apply(setPictureKenBurns(this.#slideshow, pictureId, kenBurns));
  }

  /** Drops the picture's own motion without asking; the toast's undo brings it back. */
  resetKenBurns(pictureId: string): void {
    const previous = this.#picture(pictureId).kenBurns;
    if (previous === undefined) {
      return;
    }
    this.#apply(setPictureKenBurns(this.#slideshow, pictureId, undefined));
    this.#offerUndo(pictureId, "kenBurns", this.#ports.motionAutomaticText(), () =>
      this.setKenBurns(pictureId, previous),
    );
  }

  /** The picture shows `durationMs` (validated) from now on, wherever it moves. */
  setDuration(pictureId: string, durationMs: number): void {
    this.#resetUndo.supersede(pictureId, "durationMs");
    this.#apply(setPictureDuration(this.#slideshow, pictureId, durationMs));
  }

  /** Makes the picture's duration automatic without asking; the toast's undo brings it back. */
  resetDuration(pictureId: string): void {
    const previous = this.#picture(pictureId).durationMs;
    if (previous === undefined) {
      return;
    }
    this.#apply(setPictureDuration(this.#slideshow, pictureId, undefined));
    this.#offerUndo(pictureId, "durationMs", this.#ports.durationAutomaticText(), () =>
      this.setDuration(pictureId, previous),
    );
  }

  /** The picture hands over to the next one with `transition` from now on, wherever it moves. */
  setTransition(pictureId: string, transition: TransitionChoice): void {
    this.#resetUndo.supersede(pictureId, "transition");
    this.#apply(setPictureTransition(this.#slideshow, pictureId, transition));
  }

  /** Makes the picture's transition automatic without asking; the toast's undo brings it back. */
  resetTransition(pictureId: string): void {
    const previous = this.#picture(pictureId).transition;
    if (previous === undefined) {
      return;
    }
    this.#apply(setPictureTransition(this.#slideshow, pictureId, undefined));
    this.#offerUndo(pictureId, "transition", this.#ports.transitionAutomaticText(), () =>
      this.setTransition(pictureId, previous),
    );
  }

  /** Every picture without its own transition hands over with `transition` from now on. */
  setSlideshowTransition(transition: SlideshowTransition): void {
    this.#resetUndo.supersede(this.#slideshow.id, "slideshowTransition");
    this.#apply(setSlideshowTransition(this.#slideshow, transition));
  }

  /** Returns the default to crossfade without asking; the toast's undo brings it back. */
  resetSlideshowTransition(): void {
    const previous = this.#slideshow.transition;
    if (previous === undefined) {
      return;
    }
    this.#apply(setSlideshowTransition(this.#slideshow, undefined));
    this.#resetUndo.offer(
      this.#slideshow.id,
      "slideshowTransition",
      this.#ports.slideshowTransitionResetText(),
      () => this.setSlideshowTransition(previous),
    );
  }

  /** Reverses the picture's motion; an automatic one becomes the picture's own. */
  swapKenBurns(pictureId: string): void {
    const index = this.#slideshow.pictures.findIndex((picture) => picture.id === pictureId);
    const { from, to } = pictureKenBurns(index, this.#picture(pictureId));
    this.setKenBurns(pictureId, { from: to, to: from });
  }

  /** Stores the caption as typed, normalised; a keystroke that changes nothing stores nothing. */
  setCaption(pictureId: string, typed: string): void {
    const edited = setPictureCaption(this.#slideshow, pictureId, typed);
    const index = this.#slideshow.pictures.findIndex((picture) => picture.id === pictureId);
    if (edited.pictures[index]?.caption !== this.#picture(pictureId).caption) {
      this.#apply(edited);
    }
  }

  // The music's edits offer no undo: one tap on "whole track" or "automatic" restores them.

  /** Plays only `trim` of the music; `undefined` or the whole track plays all of it. */
  setMusicTrim(trim: MusicTrim | undefined): void {
    this.#apply(setMusicTrim(this.#slideshow, trim));
  }

  /** The music's own fade-in in ms, 0 being off; `undefined` makes it automatic. */
  setMusicFadeIn(fadeInMs: number | undefined): void {
    this.#apply(setMusicFadeIn(this.#slideshow, fadeInMs));
  }

  /** The music's own fade-out in ms, 0 being off; `undefined` makes it automatic. */
  setMusicFadeOut(fadeOutMs: number | undefined): void {
    this.#apply(setMusicFadeOut(this.#slideshow, fadeOutMs));
  }

  /** Resolves once every edit made so far is stored (or reported as failed). */
  settled(): Promise<void> {
    return this.#saver.settled();
  }

  /** The screen closes: its undo toast would act on a slideshow no longer shown. */
  dispose(): void {
    this.#removalUndo.end();
    this.#resetUndo.end();
  }

  /** The undo of a reset; a picture removed meanwhile has nothing to bring back. */
  #offerUndo(
    pictureId: string,
    setting: ResettableSetting,
    text: string,
    restore: () => void,
  ): void {
    this.#resetUndo.offer(pictureId, setting, text, () => {
      if (this.#slideshow.pictures.some((picture) => picture.id === pictureId)) {
        restore();
      }
    });
  }

  #picture(pictureId: string) {
    const picture = this.#slideshow.pictures.find((candidate) => candidate.id === pictureId);
    if (picture === undefined) {
      throw new Error(`slideshow "${this.#slideshow.id}" holds no picture "${pictureId}"`);
    }
    return picture;
  }

  #apply(slideshow: StoredSlideshow): void {
    if (this.#saver.gone) {
      return;
    }
    this.#slideshow = slideshow;
    this.#saver.save(slideshow);
    for (const listener of this.#listeners) {
      listener(slideshow);
    }
  }
}
