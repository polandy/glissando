import { OWN_SECONDS_PICTURE_LENGTH, type PictureLength } from "../../library/picture-length";
import { buildStoredSlideshow } from "../../compose";
import type { ImmichPhoto } from "../../immich/immich-client";
import type { PictureImport } from "../../import/picture-import";
import type { LibraryStore } from "../../library/library-store";
import { DEFAULT_SECONDS_PER_PICTURE, type StoredSlideshow } from "../../library/stored-slideshow";
import type { SampleTrack, SampleTrackId } from "../../sample-music/sample-tracks";
import type { SlideshowHome } from "../routes/slideshow-storage";
import type { SampleSongPickPorts, SampleSongRow } from "../sample-music/sample-song-pick";
import type { ChosenMusic, MusicPickPorts, PendingSong } from "./music-pick";
import { addPickedSongs, type SongReadQueue } from "./picked-song-intake";
import { PictureIntake, type PictureIntakePorts } from "./picture-intake";
import {
  addSampleTrack as addSampleTrackRow,
  isSampleTrackAdded as isSampleTrackAddedRow,
  removeSampleTrack as removeSampleTrackRow,
  songRecord,
  storeChosenSongs,
} from "./sample-track-intake";
import { SessionArrangement } from "./session-arrangement";
import type { SongRowHost } from "./song-row-host";

export interface ImportSessionPorts extends PictureIntakePorts, MusicPickPorts {
  readonly store: LibraryStore;
  /**
   * Creates a server slideshow with its songs' audio, one blob per song in playlist order
   * (`ServerLibrary.createSlideshow`).
   */
  createOnServer(slideshow: StoredSlideshow, songsAudio: readonly Blob[]): Promise<StoredSlideshow>;
  /** Uniform in [0, 1); what Shuffle draws the pictures step's order from. */
  readonly random: () => number;
  /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md): no track can be added. */
  readonly sampleMusic?: SampleSongPickPorts;
}

/** A song of step 2's list: chosen, or still pending; `key` names its row. */
export type ImportSong =
  | PendingSong
  | ({ readonly key: number } & ChosenMusic)
  | ({ readonly key: number } & SampleSongRow);

export type ChosenSong = Extract<ImportSong, { kind: "chosen" }>;

/** The songs the slideshow is created with, in the list's order. */
export function chosenSongs(choices: ImportChoices): ChosenSong[] {
  return choices.songs.filter((song): song is ChosenSong => song.kind === "chosen");
}

/** Where the slideshow lives (step 1) and step 2's choices. */
export interface ImportChoices {
  /** A server slideshow links Immich photos and is created on the server (ADR-0018). */
  readonly home: SlideshowHome;
  /** Played one after another in this order (ADR-0023). */
  readonly songs: readonly ImportSong[];
  readonly secondsPerPicture: number;
  /** With music, the pictures last their seconds (the default) or, `undefined`, fill it. */
  readonly pictureLength: PictureLength | undefined;
}

const INITIAL_CHOICES: ImportChoices = {
  home: "device",
  songs: [],
  secondsPerPicture: DEFAULT_SECONDS_PER_PICTURE,
  pictureLength: OWN_SECONDS_PICTURE_LENGTH,
};

/**
 * One "new slideshow" in the making: the pictures of step 1, the choices of step 2 and the
 * creation. It lives as long as the tab keeps it, so leaving the wizard by the back gesture
 * keeps the selection. Its media, the songs too, are claimed by the intake until the import is
 * created or discarded.
 */
export class ImportSession {
  readonly intake: PictureIntake;
  readonly pictures: PictureImport;
  /** The pictures step's strip order for this new slideshow (IMPORT_ARRANGING.md, Order). */
  readonly arrangement: SessionArrangement;
  readonly #ports: ImportSessionPorts;
  readonly #choiceListeners = new Set<(choices: ImportChoices) => void>();
  #choices = INITIAL_CHOICES;
  #nextSongKey = 0;
  /** Per song in the list, by key: cancels its reading when it is removed. */
  readonly #songReads = new Map<number, AbortController>();
  /** Songs are read one at a time, in the order picked: a conversion takes the device's power. */
  #songQueue: Promise<void> = Promise.resolve();
  readonly #songRowHost: SongRowHost = {
    songs: () => this.#choices.songs,
    setSongs: (songs) => this.#setChoices({ songs }),
    nextKey: () => (this.#nextSongKey += 1),
    beginRead: (key) => {
      const controller = new AbortController();
      this.#songReads.set(key, controller);
      return controller.signal;
    },
    readSignal: (key) => this.#songReads.get(key)?.signal,
    removeSong: (key) => this.removeSong(key),
  };
  readonly #songReadQueue: SongReadQueue = {
    next: (step) => {
      const read = this.#songQueue.then(step);
      // The next read waits for this one's end; its failure is the caller's, through `next`.
      this.#songQueue = read.catch(() => undefined);
      return read;
    },
  };

  constructor(ports: ImportSessionPorts) {
    this.#ports = ports;
    this.intake = new PictureIntake(ports);
    this.pictures = this.intake.pictures;
    this.arrangement = new SessionArrangement({
      pictures: this.pictures,
      exempt: (ids) => this.intake.culling.exempt(ids),
      random: ports.random,
    });
  }

  /** The Svelte store contract over step 2's choices. */
  readonly choices = {
    current: (): ImportChoices => this.#choices,
    subscribe: (listener: (choices: ImportChoices) => void): (() => void) => {
      this.#choiceListeners.add(listener);
      listener(this.#choices);
      return () => this.#choiceListeners.delete(listener);
    },
  };

  /** Where the slideshow lives; fixed once a picture is in. */
  chooseHome(home: SlideshowHome): void {
    if (home === this.#choices.home) return;
    if (this.pictures.state.pictures.length > 0 || this.pictures.state.busy) {
      throw new Error(`cannot move the slideshow to the ${home}: clear the pictures first`);
    }
    this.#setChoices({ home });
  }

  addPictures(files: readonly File[]): void {
    if (this.#choices.home === "server") {
      throw new Error("a server slideshow only links photos from Immich: add none from the device");
    }
    this.intake.addPictures(files);
  }

  /** Downloaded for a device slideshow, linked for a server slideshow. */
  addImmichPhotos(photos: readonly ImmichPhoto[]): void {
    if (this.#choices.home === "server") {
      this.intake.linkImmichPhotos(photos).catch((error: unknown) => this.#ports.onError(error));
    } else {
      this.intake.addImmichPhotos(photos);
    }
  }

  /** Resolves once an unexpected picture-import error, if any, has been reported or logged. */
  reported(): Promise<void> {
    return this.intake.reported();
  }

  /** Appends the files to the song list, each read in turn (picked-song-intake.ts, ADR-0020). */
  addSongs(files: readonly File[]): Promise<void> {
    return addPickedSongs(this.#songRowHost, files, this.#ports, this.#songReadQueue);
  }

  /** Takes the song out of the list, cancelling its conversion. */
  removeSong(key: number): void {
    this.#songReads.get(key)?.abort();
    this.#songReads.delete(key);
    this.#setChoices({ songs: this.#choices.songs.filter((song) => song.key !== key) });
  }

  /** Whether `trackId` already has a row: downloading or chosen (SAMPLE_MUSIC.md). */
  isSampleTrackAdded(trackId: SampleTrackId): boolean {
    return isSampleTrackAddedRow(this.#songRowHost, trackId);
  }

  /**
   * Adds a sample track (SAMPLE_MUSIC.md): reused from this device without a download, or
   * downloaded and checked, its row reporting progress until it is chosen or fails. A track
   * already in the list, downloading or chosen, is left alone.
   */
  addSampleTrack(track: SampleTrack): Promise<void> {
    return addSampleTrackRow(this.#songRowHost, track, this.#ports.sampleMusic);
  }

  /** Takes the row holding `trackId` out of the list, cancelling its download. */
  removeSampleTrack(trackId: SampleTrackId): void {
    removeSampleTrackRow(this.#songRowHost, trackId);
  }

  /**
   * Moves the song to `toIndex` among the chosen songs, the places the list offers; a pending one
   * keeps its place among the others.
   */
  moveSong(key: number, toIndex: number): void {
    const songs = this.#choices.songs;
    const song = songs.find((candidate) => candidate.key === key);
    const target = chosenSongs(this.#choices)[toIndex];
    if (song === undefined || target === undefined) {
      throw new Error(
        `cannot move song ${String(key)} to place ${String(toIndex)}: no such song or place`,
      );
    }
    // Inserted where the target stood: before it moving up, after it moving down.
    const at = songs.indexOf(target);
    const others = songs.filter((candidate) => candidate !== song);
    this.#setChoices({ songs: [...others.slice(0, at), song, ...others.slice(at)] });
  }

  setSecondsPerPicture(secondsPerPicture: number): void {
    this.#setChoices({ secondsPerPicture });
  }

  /** `undefined`: the pictures fill the music (ADR-0022). */
  setPictureLength(pictureLength: PictureLength | undefined): void {
    this.#setChoices({ pictureLength });
  }

  /**
   * Stores every chosen song and the slideshow record, last, or creates it on the server; `locale` writes
   * the title's month. A failure keeps the session as it was.
   */
  async create(locale: string): Promise<StoredSlideshow> {
    const state = this.pictures.state;
    if (state.busy) {
      throw new Error("cannot create the slideshow: pictures are still being imported");
    }
    if (this.intake.culling.state.checking !== null) {
      throw new Error("cannot create the slideshow: pictures are still being checked");
    }
    if (state.pictures.length === 0) {
      throw new Error("cannot create a slideshow with no pictures: import at least one first");
    }
    if (
      this.#choices.songs.some(
        (song) =>
          song.kind === "reading" ||
          song.kind === "converting" ||
          song.kind === "downloadingSample",
      )
    ) {
      throw new Error(
        "cannot create the slideshow: a song is still being read, converted or downloaded",
      );
    }
    const onServer = this.#choices.home === "server";
    const chosen = chosenSongs(this.#choices);
    const songs = onServer
      ? chosen.map((song) => songRecord(this.#ports.newId(), song))
      : await storeChosenSongs(chosen, {
          putMusic: (id, audio) => this.#ports.store.putMusic(id, audio),
          claim: (id) => this.intake.claim(id),
          newId: () => this.#ports.newId(),
        });
    const slideshow = buildStoredSlideshow({
      id: this.#ports.newId(),
      createdAt: this.#ports.now().toISOString(),
      pictures: state.pictures,
      order: this.arrangement.state.order,
      songs,
      secondsPerPicture: this.#choices.secondsPerPicture,
      ...(this.#choices.pictureLength === undefined
        ? {}
        : { pictureLength: this.#choices.pictureLength }),
      ...(this.arrangement.state.own ? { ownOrder: true } : {}),
      locale,
    });
    if (onServer) {
      return this.#ports.createOnServer(
        slideshow,
        chosen.map((song) => song.file),
      );
    }
    await this.#ports.store.saveSlideshow(slideshow);
    await this.intake.endClaim();
    return slideshow;
  }

  /**
   * Forgets the selection and starts a new import; resolves once the store spares the discarded
   * media no longer, so the clean-up that follows deletes it.
   */
  discard(): Promise<void> {
    for (const read of this.#songReads.values()) read.abort();
    this.#songReads.clear();
    this.#setChoices(INITIAL_CHOICES);
    this.arrangement.reset();
    return this.intake.discard();
  }

  #setChoices(change: Partial<ImportChoices>): void {
    this.#choices = { ...this.#choices, ...change };
    for (const listener of this.#choiceListeners) {
      listener(this.#choices);
    }
  }
}
