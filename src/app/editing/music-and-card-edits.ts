import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
import type { PictureLength } from "../../library/picture-length";
import type { CardInput } from "../../library/stored-card";
import type { StoredCard, StoredMusic } from "../../library/stored-slideshow";
import type { CardSettingsEditor } from "./card-settings-editor";
import type { MusicSettingsEditor } from "./music-settings-editor";

/** The slideshow editor's music and card edits, each handed on to the sub-editor that stores it. */
export abstract class MusicAndCardEdits {
  protected abstract readonly musicSettings: MusicSettingsEditor;
  protected abstract readonly cardSettings: CardSettingsEditor;

  addSongs(songs: readonly StoredMusic[]): void {
    this.musicSettings.addSongs(songs);
  }

  removeSong(songId: string): void {
    this.musicSettings.removeSong(songId);
  }

  moveSong(songId: string, toIndex: number): void {
    this.musicSettings.moveSong(songId, toIndex);
  }

  setBetweenSongs(betweenSongs: BetweenSongs | undefined): void {
    this.musicSettings.setBetweenSongs(betweenSongs);
  }

  setRepeatMusic(repeatMusic: true | undefined): void {
    this.musicSettings.setRepeatMusic(repeatMusic);
  }

  setMusicTrim(songId: string, trim: MusicTrim | undefined): void {
    this.musicSettings.setMusicTrim(songId, trim);
  }

  setMusicFadeIn(songId: string, fadeInMs: number | undefined): void {
    this.musicSettings.setMusicFadeIn(songId, fadeInMs);
  }

  setMusicFadeOut(songId: string, fadeOutMs: number | undefined): void {
    this.musicSettings.setMusicFadeOut(songId, fadeOutMs);
  }

  setMusicPictureChanges(songId: string, pictureChanges: PictureChanges | undefined): void {
    this.musicSettings.setMusicPictureChanges(songId, pictureChanges);
  }

  setMusicVolume(songId: string, volumeDb: number | undefined): void {
    this.musicSettings.setMusicVolume(songId, volumeDb);
  }

  setPictureLength(pictureLength: PictureLength | undefined): void {
    this.musicSettings.setPictureLength(pictureLength);
  }

  setSecondsPerPicture(seconds: number): void {
    this.musicSettings.setSecondsPerPicture(seconds);
  }

  ensureOpeningCard(): StoredCard {
    return this.cardSettings.ensureOpeningCard();
  }

  setOpeningCard(card: CardInput): void {
    this.cardSettings.setOpeningCard(card);
  }

  removeOpeningCard(): void {
    this.cardSettings.removeOpeningCard();
  }

  ensureClosingCard(): StoredCard {
    return this.cardSettings.ensureClosingCard();
  }

  setClosingCard(card: CardInput): void {
    this.cardSettings.setClosingCard(card);
  }

  removeClosingCard(): void {
    this.cardSettings.removeClosingCard();
  }
}
