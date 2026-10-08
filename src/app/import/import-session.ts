import { buildStoredSlideshow } from "../../compose";
import type { MusicProbe } from "../../import/music-probe";
import { PictureImport, type PictureImportPorts } from "../../import/picture-import";
import {
  DEFAULT_SECONDS_PER_PICTURE,
  type LibraryStore,
  type StoredMusic,
  type StoredSlideshow,
} from "../../library/stored-slideshow";

export interface ImportSessionPorts extends Pick<PictureImportPorts, "decode" | "captureDate"> {
  readonly store: LibraryStore;
  probeMusic(file: File): Promise<MusicProbe>;
  /** Media and slideshow ids; the composition root spares media ids from the clean-up. */
  newId(): string;
  now(): Date;
  /** An unexpected error of the picture import, which runs on without a caller to throw to. */
  onError(error: unknown): void;
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
 * keeps the selection.
 */
export class ImportSession {
  readonly pictures: PictureImport;
  readonly #ports: ImportSessionPorts;
  readonly #choiceListeners = new Set<(choices: ImportChoices) => void>();
  #choices = INITIAL_CHOICES;
  #reporting: Promise<void> = Promise.resolve();

  constructor(ports: ImportSessionPorts) {
    this.#ports = ports;
    this.pictures = new PictureImport({
      decode: ports.decode,
      captureDate: ports.captureDate,
      store: ports.store,
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
    this.#reporting = this.pictures.settled().catch(this.#ports.onError);
  }

  /** Resolves once an unexpected picture-import error, if any, has been reported. */
  reported(): Promise<void> {
    return this.#reporting;
  }

  /** Rejects with `UnreadableMusicError` and keeps the previous choice. */
  async chooseMusic(file: File): Promise<void> {
    const { durationMs } = await this.#ports.probeMusic(file);
    this.#setChoices({ music: { file, durationMs } });
  }

  removeMusic(): void {
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
    return slideshow;
  }

  /** Forgets the selection; its stored media is left for the unreferenced-media clean-up. */
  discard(): void {
    this.pictures.cancel();
    this.#setChoices(INITIAL_CHOICES);
  }

  async #storeMusic(): Promise<StoredMusic | undefined> {
    const chosen = this.#choices.music;
    if (chosen === null) {
      return undefined;
    }
    const id = this.#ports.newId();
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
