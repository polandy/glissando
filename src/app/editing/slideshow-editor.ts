import type { OwnKenBurns } from "../../library/own-ken-burns";
import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";
import type { PortraitPictures } from "../../library/portrait-pictures";
import { setPictureAlone as setPictureAloneEdit } from "../../library/slideshow-edits";
import type { PictureLength } from "../../library/picture-length";
import type { StoredCard, StoredMusic, StoredSlideshow } from "../../library/stored-slideshow";
import type { CardInput } from "../../library/stored-card";
import { CardSettingsEditor } from "./card-settings-editor";
import { ChapterSettingsEditor } from "./chapter-settings-editor";
import { EditSaver } from "./edit-saver";
import { EditorUndos } from "./editor-undos";
import { LookSettingsEditor } from "./look-settings-editor";
import { MusicSettingsEditor } from "./music-settings-editor";
import { PictureListEditor } from "./picture-list-editor";
import { PictureSettingsEditor } from "./picture-settings-editor";
import { VideoSettingsEditor } from "./video-settings-editor";
import type { SlideshowEditorPorts } from "./slideshow-editor-ports";

/**
 * The slideshow screen's edits: each applies at once and is stored. Removing needs no confirmation;
 * its toast undoes every removal made while it is shown, and any other edit ends that batch, so an
 * undo never puts pictures back at positions that shifted meanwhile. While the toast is shown, the
 * removed pictures' media is claimed, so a clean-up in any tab spares it.
 */
export class SlideshowEditor {
  readonly #listeners = new Set<(slideshow: StoredSlideshow) => void>();
  #slideshow: StoredSlideshow;
  readonly #undos: EditorUndos;
  readonly #saver: EditSaver;
  readonly #pictureSettings: PictureSettingsEditor;
  readonly #pictureList: PictureListEditor;
  readonly #musicSettings: MusicSettingsEditor;
  readonly #cardSettings: CardSettingsEditor;
  /** The clip settings of the video slides. */
  readonly video: VideoSettingsEditor;
  /** The automatic and added trip chapters (TRIP_CHAPTERS.md). */
  readonly chapters: ChapterSettingsEditor;
  /** The slideshow's colour grade (ADR-0044). */
  readonly look: LookSettingsEditor;

  constructor(initial: StoredSlideshow, ports: SlideshowEditorPorts) {
    this.#slideshow = initial;
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
    this.#pictureList = new PictureListEditor(
      ports,
      this.#undos,
      () => this.#slideshow,
      (slideshow) => this.#apply(slideshow),
    );
    this.#musicSettings = new MusicSettingsEditor(
      this.#undos.songRemoval,
      () => this.#slideshow,
      (slideshow) => this.#apply(slideshow),
    );
    this.video = new VideoSettingsEditor(
      () => this.#slideshow,
      (slideshow) => this.#apply(slideshow),
    );
    this.#cardSettings = new CardSettingsEditor(
      ports,
      () => this.#slideshow,
      (slideshow) => this.#apply(slideshow),
    );
    this.chapters = new ChapterSettingsEditor(
      () => this.#slideshow,
      (slideshow) => this.#apply(slideshow),
    );
    this.look = new LookSettingsEditor(
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
    this.#pictureList.remove(pictureId);
  }

  /**
   * Removes the whole selection; at least one picture stays, so removing every picture is
   * refused with a toast instead. A single id keeps `remove`'s own text for that case.
   */
  removeGroup(pictureIds: readonly string[]): void {
    this.#pictureList.removeGroup(pictureIds);
  }

  /** Pictures just added on the add screen: the toast's undo takes those still here out. */
  offerAddUndo(pictureIds: readonly string[]): void {
    this.#pictureList.offerAddUndo(pictureIds);
  }

  /** Moves the group contiguous to the slot before the picture at `insertion` (a drop). */
  moveGroup(pictureIds: readonly string[], insertion: number): void {
    this.#pictureList.moveGroup(pictureIds, insertion);
  }

  /** Moves the group by `offset` steps (Earlier/Later or Shift+arrows), clamped to the ends. */
  shiftGroup(pictureIds: readonly string[], offset: number): void {
    this.#pictureList.shiftGroup(pictureIds, offset);
  }

  /** Puts the pictures in a new random order; the toast's undo brings the old one back. */
  shuffle(): void {
    this.#pictureList.shuffle();
  }

  rename(typed: string): void {
    this.#pictureList.rename(typed);
  }

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

  setPortraitPictures(portraitPictures: PortraitPictures): void {
    this.#pictureSettings.setPortraitPictures(portraitPictures);
  }

  resetPortraitPictures(): void {
    this.#pictureSettings.resetPortraitPictures();
  }

  /** Marks the picture never to be composed into a portrait pair, or lets it be again. */
  setPictureAlone(pictureId: string, alone: boolean): void {
    this.#apply(setPictureAloneEdit(this.#slideshow, pictureId, alone));
  }

  /** Reverses the picture's motion; an automatic one becomes the picture's own. */
  swapKenBurns(pictureId: string): void {
    this.#pictureSettings.swapKenBurns(pictureId);
  }

  /** Stores the caption as typed, normalised; a keystroke that changes nothing stores nothing. */
  setCaption(pictureId: string, typed: string): void {
    this.#pictureList.setCaption(pictureId, typed);
  }

  addSongs(songs: readonly StoredMusic[]): void {
    this.#musicSettings.addSongs(songs);
  }

  removeSong(songId: string): void {
    this.#musicSettings.removeSong(songId);
  }

  moveSong(songId: string, toIndex: number): void {
    this.#musicSettings.moveSong(songId, toIndex);
  }

  setBetweenSongs(betweenSongs: BetweenSongs | undefined): void {
    this.#musicSettings.setBetweenSongs(betweenSongs);
  }

  setMusicTrim(songId: string, trim: MusicTrim | undefined): void {
    this.#musicSettings.setMusicTrim(songId, trim);
  }

  setMusicFadeIn(songId: string, fadeInMs: number | undefined): void {
    this.#musicSettings.setMusicFadeIn(songId, fadeInMs);
  }

  setMusicFadeOut(songId: string, fadeOutMs: number | undefined): void {
    this.#musicSettings.setMusicFadeOut(songId, fadeOutMs);
  }

  setMusicPictureChanges(songId: string, pictureChanges: PictureChanges | undefined): void {
    this.#musicSettings.setMusicPictureChanges(songId, pictureChanges);
  }

  setMusicVolume(songId: string, volumeDb: number | undefined): void {
    this.#musicSettings.setMusicVolume(songId, volumeDb);
  }

  setPictureLength(pictureLength: PictureLength | undefined): void {
    this.#musicSettings.setPictureLength(pictureLength);
  }

  setSecondsPerPicture(seconds: number): void {
    this.#musicSettings.setSecondsPerPicture(seconds);
  }

  ensureOpeningCard(): StoredCard {
    return this.#cardSettings.ensureOpeningCard();
  }

  setOpeningCard(card: CardInput): void {
    this.#cardSettings.setOpeningCard(card);
  }

  removeOpeningCard(): void {
    this.#cardSettings.removeOpeningCard();
  }

  ensureClosingCard(): StoredCard {
    return this.#cardSettings.ensureClosingCard();
  }

  setClosingCard(card: CardInput): void {
    this.#cardSettings.setClosingCard(card);
  }

  removeClosingCard(): void {
    this.#cardSettings.removeClosingCard();
  }

  /** Resolves once every edit made so far is stored (or reported as failed). */
  settled(): Promise<void> {
    return this.#saver.settled();
  }

  /** The screen closes: its undo toast would act on a slideshow no longer shown. */
  dispose(): void {
    this.#undos.end();
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
