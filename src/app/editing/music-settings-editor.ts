import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
import type { PictureLength } from "../../library/picture-length";
import {
  addSongs,
  moveSong,
  removeSong,
  setBetweenSongs,
  songIndex,
} from "../../library/slideshow-edits-songs";
import {
  setMusicFadeIn,
  setMusicFadeOut,
  setMusicPictureChanges,
  setMusicTrim,
  setMusicVolume,
} from "../../library/slideshow-edits-music";
import { setPictureLength, setSecondsPerPicture } from "../../library/slideshow-edits-timing";
import type { StoredMusic, StoredSlideshow } from "../../library/stored-slideshow";
import type { ResetUndo } from "./reset-undo";
import type { SongRemovalUndo } from "./song-removal-undo";

/** What `MusicSettingsEditor` needs from the screen to word its undo toast. */
export interface MusicSettingsPorts {
  /** The undo toast's text after this edit silently left an active mood (ADR-0045 `leaveMood`). */
  readonly moodNowCustomText: () => string;
}

/**
 * The slideshow screen's playlist and timing edits: each applies at once, through the
 * `SlideshowEditor` that owns this instance. A song removed gets a toast whose undo puts it
 * back; the other edits offer none, since one tap on "whole track" or "automatic" restores them
 * — except where leaving an active mood needs its own undo (ADR-0045).
 */
export class MusicSettingsEditor {
  readonly #songRemoval: SongRemovalUndo;
  readonly #ports: MusicSettingsPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    songRemoval: SongRemovalUndo,
    ports: MusicSettingsPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#songRemoval = songRemoval;
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  /** Appends `songs`, their media already stored, to the playlist (ADR-0023). */
  addSongs(songs: readonly StoredMusic[]): void {
    this.#apply(addSongs(this.#current(), songs));
  }

  /**
   * Takes the song out of the playlist; its toast puts it back. While the toast is shown, the
   * song's media is claimed, so a clean-up in any tab spares it.
   */
  removeSong(songId: string): void {
    const slideshow = this.#current();
    const index = songIndex(slideshow, songId);
    const song = slideshow.songs[index] as StoredMusic;
    this.#songRemoval.add(song, index, (removed, at) => {
      const restored = addSongs(this.#current(), [removed]);
      this.#apply(moveSong(restored, removed.id, Math.min(at, restored.songs.length - 1)));
    });
    this.#apply(removeSong(slideshow, songId));
  }

  /** Moves the song to `toIndex` of the playlist. */
  moveSong(songId: string, toIndex: number): void {
    this.#apply(moveSong(this.#current(), songId, toIndex));
  }

  /** `"sequence"`: one song after another; `undefined`: they crossfade. */
  setBetweenSongs(betweenSongs: BetweenSongs | undefined): void {
    this.#apply(setBetweenSongs(this.#current(), betweenSongs));
  }

  /** Plays only `trim` of the song; `undefined` or the whole track plays all of it. */
  setMusicTrim(songId: string, trim: MusicTrim | undefined): void {
    this.#apply(setMusicTrim(this.#current(), songId, trim));
  }

  /** The song's own fade-in in ms, 0 being off; `undefined` makes it automatic. */
  setMusicFadeIn(songId: string, fadeInMs: number | undefined): void {
    this.#apply(setMusicFadeIn(this.#current(), songId, fadeInMs));
  }

  /** The song's own fade-out in ms, 0 being off; `undefined` makes it automatic. */
  setMusicFadeOut(songId: string, fadeOutMs: number | undefined): void {
    this.#apply(setMusicFadeOut(this.#current(), songId, fadeOutMs));
  }

  /** `"even"` shares the song evenly; `undefined` changes the pictures on the beat (ADR-0021). */
  setMusicPictureChanges(songId: string, pictureChanges: PictureChanges | undefined): void {
    this.#apply(setMusicPictureChanges(this.#current(), songId, pictureChanges));
  }

  /** The song's own volume in whole dB off the levelled default; `undefined` or `0` levels it. */
  setMusicVolume(songId: string, volumeDb: number | undefined): void {
    this.#apply(setMusicVolume(this.#current(), songId, volumeDb));
  }

  /**
   * `"seconds"`: the pictures last their seconds with music too; `undefined`: they fill it.
   * While a mood is on, this leaves it first (ADR-0045); the toast's undo brings the slideshow
   * back as it was, mood included.
   */
  setPictureLength(pictureLength: PictureLength | undefined): void {
    const before = this.#current();
    this.#apply(setPictureLength(before, pictureLength));
    this.#offerMoodLeftUndo(before);
  }

  /**
   * How long each picture without an own duration stays, in half-second steps. While a mood is
   * on, this leaves it first (ADR-0045); the toast's undo brings the slideshow back as it was,
   * mood included.
   */
  setSecondsPerPicture(seconds: number): void {
    const before = this.#current();
    this.#apply(setSecondsPerPicture(before, seconds));
    this.#offerMoodLeftUndo(before);
  }

  /** Offers the "Mood is now Custom" undo when `before`'s mood just left by this edit. */
  #offerMoodLeftUndo(before: StoredSlideshow): void {
    if (before.mood !== undefined && this.#current().mood === undefined) {
      this.#reset.offer(before.id, "slideshowMood", this.#ports.moodNowCustomText(), () =>
        this.#apply(before),
      );
    }
  }
}
