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
import type { SlideshowHome } from "../routes/slideshow-storage";
import { PictureIntake, type PictureIntakePorts } from "./picture-intake";

export interface ImportSessionPorts extends PictureIntakePorts {
  readonly store: LibraryStore;
  probeMusic(file: File): Promise<MusicProbe>;
  /** Creates a server slideshow with its music's audio (`ServerLibrary.createSlideshow`). */
  createOnServer(slideshow: StoredSlideshow, musicAudio: Blob | null): Promise<StoredSlideshow>;
}

export interface ChosenMusic {
  readonly file: File;
  readonly durationMs: number;
}

/** Where the slideshow lives (step 1) and step 2's choices. */
export interface ImportChoices {
  /** A server slideshow links Immich photos and is created on the server (ADR-0018). */
  readonly home: SlideshowHome;
  readonly music: ChosenMusic | null;
  readonly secondsPerPicture: number;
}

const INITIAL_CHOICES: ImportChoices = {
  home: "device",
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
    if (this.#choices.home === "server") this.intake.linkImmichPhotos(photos);
    else this.intake.addImmichPhotos(photos);
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

  /**
   * Stores the music and the slideshow record, last, or creates it on the server; `locale` writes
   * the title's month. A failure keeps the session as it was.
   */
  async create(locale: string): Promise<StoredSlideshow> {
    const state = this.pictures.state;
    if (state.busy) {
      throw new Error("cannot create the slideshow: pictures are still being imported");
    }
    if (state.pictures.length === 0) {
      throw new Error("cannot create a slideshow with no pictures: import at least one first");
    }
    const onServer = this.#choices.home === "server";
    const music = onServer ? this.#musicOnServer() : await this.#storeMusic();
    const slideshow = buildStoredSlideshow({
      id: this.#ports.newId(),
      createdAt: this.#ports.now().toISOString(),
      pictures: state.pictures,
      ...(music === undefined ? {} : { music }),
      secondsPerPicture: this.#choices.secondsPerPicture,
      locale,
    });
    if (onServer) {
      return this.#ports.createOnServer(slideshow, this.#choices.music?.file ?? null);
    }
    await this.#ports.store.saveSlideshow(slideshow);
    await this.intake.endClaim();
    return slideshow;
  }

  /** The music record of a server slideshow; its audio is uploaded with the slideshow. */
  #musicOnServer(): StoredMusic | undefined {
    const chosen = this.#choices.music;
    if (chosen === null) return undefined;
    return {
      id: this.#ports.newId(),
      fileName: chosen.file.name,
      durationMs: chosen.durationMs,
      mimeType: chosen.file.type,
    };
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
