import {
  moveGroup as moveGroupInSlideshow,
  shiftGroup as shiftGroupInSlideshow,
} from "../../library/group-edits";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import type { MusicTrim } from "../../library/own-music";
import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";
import {
  removePicture,
  renameSlideshow,
  restorePictures,
  setMusicFadeIn,
  setMusicFadeOut,
  setMusicTrim,
  setPictureCaption,
} from "../../library/slideshow-edits";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { EditSaver } from "./edit-saver";
import { EditorUndos } from "./editor-undos";
import { PictureSettingsEditor } from "./picture-settings-editor";
import type { SlideshowEditorPorts } from "./slideshow-editor-ports";

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
  readonly #undos: EditorUndos;
  readonly #saver: EditSaver;
  readonly #pictureSettings: PictureSettingsEditor;

  constructor(initial: StoredSlideshow, ports: SlideshowEditorPorts) {
    this.#slideshow = initial;
    this.#ports = ports;
    this.#saver = new EditSaver(initial, {
      store: ports.store,
      onError: ports.onError,
      onRefused: (shown, reason) => {
        this.#undos.removal.end();
        this.#show(shown);
        ports.onRefused(reason);
      },
      onGone: () => {
        this.#undos.removal.end();
        ports.onGone();
      },
    });
    this.#undos = new EditorUndos(ports, {
      current: () => this.#slideshow,
      apply: (slideshow) => this.#apply(slideshow),
      track: (work) => this.#saver.track(work),
    });
    this.#pictureSettings = new PictureSettingsEditor(
      ports,
      this.#undos.reset,
      () => this.#slideshow,
      (slideshow) => this.#apply(slideshow),
    );
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
    this.#removeOne(pictureId);
  }

  /**
   * Removes the whole selection; at least one picture stays, so removing every picture is
   * refused with a toast instead. A single id keeps `remove`'s own text for that case.
   */
  removeGroup(pictureIds: readonly string[]): void {
    if (pictureIds.length === 1) {
      this.remove(pictureIds[0] as string);
      return;
    }
    if (new Set(pictureIds).size >= this.#slideshow.pictures.length) {
      this.#ports.toaster.show({ text: this.#ports.everyPictureText(), tone: "info" });
      return;
    }
    for (const pictureId of pictureIds) {
      this.#removeOne(pictureId);
    }
  }

  /** Pictures just added on the add screen: the toast's undo takes those still here out. */
  offerAddUndo(pictureIds: readonly string[]): void {
    this.#undos.add.offer(pictureIds);
  }

  /** Moves the group contiguous to the slot before the picture at `insertion` (a drop). */
  moveGroup(pictureIds: readonly string[], insertion: number): void {
    const moved = moveGroupInSlideshow(this.#slideshow, pictureIds, insertion);
    if (moved !== this.#slideshow) {
      this.#undos.removal.end();
      this.#apply(moved);
    }
  }

  /** Moves the group by `offset` steps (Earlier/Later or Shift+arrows), clamped to the ends. */
  shiftGroup(pictureIds: readonly string[], offset: number): void {
    const shifted = shiftGroupInSlideshow(this.#slideshow, pictureIds, offset);
    if (shifted !== this.#slideshow) {
      this.#undos.removal.end();
      this.#apply(shifted);
    }
  }

  rename(typed: string): void {
    const automatic = this.#ports.automaticTitle(this.#slideshow);
    this.#apply(renameSlideshow(this.#slideshow, typed, automatic));
  }

  // Ken Burns, duration and transition settings delegate to `PictureSettingsEditor`.

  setKenBurns(pictureId: string, kenBurns: OwnKenBurns): void {
    this.#pictureSettings.setKenBurns(pictureId, kenBurns);
  }

  resetKenBurns(pictureId: string): void {
    this.#pictureSettings.resetKenBurns(pictureId);
  }

  setDuration(pictureId: string, durationMs: number): void {
    this.#pictureSettings.setDuration(pictureId, durationMs);
  }

  resetDuration(pictureId: string): void {
    this.#pictureSettings.resetDuration(pictureId);
  }

  setTransition(pictureId: string, transition: TransitionChoice): void {
    this.#pictureSettings.setTransition(pictureId, transition);
  }

  resetTransition(pictureId: string): void {
    this.#pictureSettings.resetTransition(pictureId);
  }

  setSlideshowTransition(transition: SlideshowTransition): void {
    this.#pictureSettings.setSlideshowTransition(transition);
  }

  resetSlideshowTransition(): void {
    this.#pictureSettings.resetSlideshowTransition();
  }

  /** Reverses the picture's motion; an automatic one becomes the picture's own. */
  swapKenBurns(pictureId: string): void {
    this.#pictureSettings.swapKenBurns(pictureId);
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
    this.#undos.end();
  }

  /** Removes one picture at once, adding it to the shown removal batch. */
  #removeOne(pictureId: string): void {
    const { slideshow, removed } = removePicture(this.#slideshow, pictureId);
    this.#undos.removal.add(removed, (removals) =>
      this.#apply(restorePictures(this.#slideshow, removals)),
    );
    this.#apply(slideshow);
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
    this.#saver.save(slideshow);
    this.#show(slideshow);
  }

  #show(slideshow: StoredSlideshow): void {
    this.#slideshow = slideshow;
    for (const listener of this.#listeners) {
      listener(slideshow);
    }
  }
}
