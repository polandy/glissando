import { buildStoredSlideshow } from "../../compose";
import type { ImmichPhoto } from "../../immich/immich-client";
import type { MusicProbe } from "../../import/music-probe";
import type { PictureImport } from "../../import/picture-import";
import {
  DEFAULT_SECONDS_PER_PICTURE,
  type LibraryStore,
  type StoredMusic,
  type StoredSlideshow,
} from "../../library/stored-slideshow";
import { PictureIntake, type PictureIntakePorts } from "./picture-intake";

export interface ImportSessionPorts extends PictureIntakePorts {
  readonly store: LibraryStore;
  probeMusic(file: File): Promise<MusicProbe>;
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
 * keeps the selection. Its media, the music too, is claimed by the intake until the import is
 * created or discarded.
 */
export class ImportSession {
  readonly intake: PictureIntake;
  readonly pictures: PictureImport;
  readonly #ports: ImportSessionPorts;
  readonly #choiceListeners = new Set<(choices: ImportChoices) => void>();
  #choices = INITIAL_CHOICES;
  /** Bumped by every music pick, so only the latest pick's probe may set the choice. */
  #musicPick = 0;

  constructor(ports: ImportSessionPorts) {
    this.#ports = ports;
    this.intake = new PictureIntake(ports);
    this.pictures = this.intake.pictures;
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
    this.intake.addPictures(files);
  }

  addImmichPhotos(photos: readonly ImmichPhoto[]): void {
    this.intake.addImmichPhotos(photos);
  }

  /** Resolves once an unexpected picture-import error, if any, has been reported or logged. */
  reported(): Promise<void> {
    return this.intake.reported();
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
    await this.intake.endClaim();
    return slideshow;
  }

  /**
   * Forgets the selection and starts a new import; resolves once the store spares the discarded
   * media no longer, so the clean-up that follows deletes it.
   */
  discard(): Promise<void> {
    this.#musicPick += 1;
    this.#setChoices(INITIAL_CHOICES);
    return this.intake.discard();
  }

  async #storeMusic(): Promise<StoredMusic | undefined> {
    const chosen = this.#choices.music;
    if (chosen === null) {
      return undefined;
    }
    const id = this.#ports.newId();
    await this.intake.claim(id);
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
