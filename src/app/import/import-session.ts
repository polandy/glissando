import { buildStoredSlideshow } from "../../compose";
import type { MusicProbe } from "../../import/music-probe";
import {
  PictureImport,
  PictureImportFailedError,
  type PictureImportPorts,
} from "../../import/picture-import";
import {
  DEFAULT_SECONDS_PER_PICTURE,
  type LibraryStore,
  type StoredMusic,
  type StoredSlideshow,
} from "../../library/stored-slideshow";

export interface ImportSessionPorts extends Pick<PictureImportPorts, "decode" | "captureDate"> {
  readonly store: LibraryStore;
  probeMusic(file: File): Promise<MusicProbe>;
  /** Import, media and slideshow ids. */
  newId(): string;
  now(): Date;
  /** An unexpected error of the picture import, which runs on without a caller to throw to. */
  onError(error: unknown): void;
  /** Records an error the user already sees, such as a failed import shown by step 1. */
  log(error: unknown): void;
}

export interface ChosenMusic {
  readonly file: File;
  readonly durationMs: number;
}

/** Step 2's choices. */
export interface ImportChoices {
  readonly music: ChosenMusic | null;
  readonly secondsPerPicture: number;
}

const INITIAL_CHOICES: ImportChoices = {
  music: null,
  secondsPerPicture: DEFAULT_SECONDS_PER_PICTURE,
};

/**
 * One "new slideshow" in the making: the pictures of step 1, the choices of step 2 and the
 * creation. It lives as long as the tab keeps it, so leaving the wizard by the back gesture
 * keeps the selection. Every media id is claimed for the import in the store before the media is
 * written, so a clean-up in any tab spares it until the import is created or discarded.
 */
export class ImportSession {
  readonly pictures: PictureImport;
  readonly #ports: ImportSessionPorts;
  readonly #choiceListeners = new Set<(choices: ImportChoices) => void>();
  #choices = INITIAL_CHOICES;
  #reporting: Promise<void> = Promise.resolve();
  #reportedDrain: Promise<void> | null = null;
  /** Bumped by every music pick, so only the latest pick's probe may set the choice. */
  #musicPick = 0;
  #importId: string;
  /** Set by the first claim; an import that stores nothing is never recorded. */
  #startedAt: Date | null = null;

  constructor(ports: ImportSessionPorts) {
    this.#ports = ports;
    this.#importId = ports.newId();
    this.pictures = new PictureImport({
      decode: ports.decode,
      captureDate: ports.captureDate,
      store: {
        putPicture: async (id, blobs) => {
          await this.#claim(id);
          await ports.store.putPicture(id, blobs);
        },
      },
      newId: ports.newId,
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

  addPictures(files: readonly File[]): void {
    this.pictures.add(files);
    const drain = this.pictures.settled();
    if (drain !== this.#reportedDrain) {
      this.#reportedDrain = drain;
      this.#reporting = drain.catch((error: unknown) =>
        error instanceof PictureImportFailedError
          ? this.#ports.log(error)
          : this.#ports.onError(error),
      );
    }
  }

  /** Resolves once an unexpected picture-import error, if any, has been reported or logged. */
  reported(): Promise<void> {
    return this.#reporting;
  }

  /**
   * Rejects with `UnreadableMusicError` and keeps the previous choice. A pick overtaken by a
   * later pick or a removal settles without effect.
   */
  async chooseMusic(file: File): Promise<void> {
    const pick = (this.#musicPick += 1);
    try {
      const { durationMs } = await this.#ports.probeMusic(file);
      if (pick === this.#musicPick) {
        this.#setChoices({ music: { file, durationMs } });
      }
    } catch (error) {
      if (pick === this.#musicPick) {
        throw error;
      }
    }
  }

  removeMusic(): void {
    this.#musicPick += 1;
    this.#setChoices({ music: null });
  }

  setSecondsPerPicture(secondsPerPicture: number): void {
    this.#setChoices({ secondsPerPicture });
  }

  /** Stores the music and the slideshow record, last; `locale` writes the title's month. */
  async create(locale: string): Promise<StoredSlideshow> {
    const state = this.pictures.state;
    if (state.busy) {
      throw new Error("cannot create the slideshow: pictures are still being imported");
    }
    if (state.pictures.length === 0) {
      throw new Error("cannot create a slideshow with no pictures: import at least one first");
    }
    const music = await this.#storeMusic();
    const slideshow = buildStoredSlideshow({
      id: this.#ports.newId(),
      createdAt: this.#ports.now().toISOString(),
      pictures: state.pictures,
      ...(music === undefined ? {} : { music }),
      secondsPerPicture: this.#choices.secondsPerPicture,
      locale,
    });
    await this.#ports.store.saveSlideshow(slideshow);
    await this.#endImport();
    return slideshow;
  }

  /**
   * Forgets the selection and starts a new import; resolves once the store spares the discarded
   * media no longer, so the clean-up that follows deletes it.
   */
  discard(): Promise<void> {
    this.pictures.cancel();
    this.#musicPick += 1;
    this.#setChoices(INITIAL_CHOICES);
    return this.#endImport();
  }

  #claim(mediaId: string): Promise<void> {
    this.#startedAt ??= this.#ports.now();
    return this.#ports.store.claimMedia(this.#importId, this.#startedAt, mediaId);
  }

  #endImport(): Promise<void> {
    const ended = this.#importId;
    this.#importId = this.#ports.newId();
    this.#startedAt = null;
    return this.#ports.store.releaseClaim(ended);
  }

  async #storeMusic(): Promise<StoredMusic | undefined> {
    const chosen = this.#choices.music;
    if (chosen === null) {
      return undefined;
    }
    const id = this.#ports.newId();
    await this.#claim(id);
    await this.#ports.store.putMusic(id, chosen.file);
    return {
      id,
      fileName: chosen.file.name,
      durationMs: chosen.durationMs,
      mimeType: chosen.file.type,
    };
  }

  #setChoices(change: Partial<ImportChoices>): void {
    this.#choices = { ...this.#choices, ...change };
    for (const listener of this.#choiceListeners) {
      listener(this.#choices);
    }
  }
}
