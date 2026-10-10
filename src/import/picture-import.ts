import { orderByCaptureDate } from "../compose";
import { isSamePicture, type PictureIdentity } from "../library/picture-identity";
import type { LibraryStore, StoredPicture } from "../library/stored-slideshow";
import { PictureNotDownloadedError, type PictureSource, type ReadPicture } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

export type SkipReason = "unsupported" | "unreadable" | "notDownloaded" | "duplicate";

export interface SkippedFile {
  readonly fileName: string;
  readonly reason: SkipReason;
}

export interface PictureImportState {
  /** Picture files accepted so far; files dropped at full storage leave the count. */
  readonly total: number;
  /** Accepted files processed, stored or skipped, so progress "done of total" reaches total. */
  readonly done: number;
  /** By capture date ascending, ties by file name. */
  readonly pictures: readonly StoredPicture[];
  readonly skipped: readonly SkippedFile[];
  readonly storageFull: boolean;
  readonly busy: boolean;
  /** An unexpected error ended the import; `settled()` rejects with it. */
  readonly failed: boolean;
}

export interface PictureImportPorts {
  readonly store: Pick<LibraryStore, "putPicture" | "putPictureFocus">;
  newId(): string;
  /** Pictures already there, such as the slideshow's when adding to it; absent: none. */
  readonly known?: readonly PictureIdentity[];
}

interface Queued {
  readonly source: PictureSource;
  /** False for a duplicate the user takes in after all. */
  readonly skipDuplicate: boolean;
}

const PICTURE_TYPE_PREFIX = "image/";
const QUOTA_EXCEEDED = "QuotaExceededError";

const EMPTY: PictureImportState = {
  total: 0,
  done: 0,
  pictures: [],
  skipped: [],
  storageFull: false,
  busy: false,
  failed: false,
};

type Outcome =
  | { readonly kind: "stored"; readonly picture: StoredPicture }
  | { readonly kind: "skipped"; readonly reason: SkipReason }
  | { readonly kind: "storageFull" };

/** The import stopped on an unexpected error, its `cause`; the state reports it as failed. */
export class PictureImportFailedError extends Error {
  constructor(cause: unknown) {
    super("the picture import failed on an unexpected error", { cause });
    this.name = "PictureImportFailedError";
  }
}

/**
 * Step 1 of creating a slideshow, or adding to one: pictures from files or Immich in, stored
 * downscaled pictures out. Pictures are processed one at a time so memory stays bounded on phones.
 * A picture the known ones or this import already have is skipped as a duplicate before it is
 * read (ADR-0016). Media stored by a cancelled import is left unreferenced for
 * `LibraryStore.deleteUnreferencedMedia`.
 */
export class PictureImport {
  readonly #ports: PictureImportPorts;
  readonly #listeners = new Set<(state: PictureImportState) => void>();
  #state = EMPTY;
  #queue: Queued[] = [];
  /** The sources skipped as duplicates, for `addDuplicates`. */
  #duplicates: PictureSource[] = [];
  #draining: Promise<void> = Promise.resolve();
  #isDraining = false;
  /** Bumped by `cancel()`, so the file in flight at that moment is discarded. */
  #generation = 0;

  constructor(ports: PictureImportPorts) {
    this.#ports = ports;
  }

  get state(): PictureImportState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: PictureImportState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  add(sources: readonly PictureSource[]): void {
    if (this.#state.failed) {
      throw new Error("the picture import failed; cancel it or start a new one to add files");
    }
    const isPicture = (source: PictureSource): boolean =>
      source.mimeType.startsWith(PICTURE_TYPE_PREFIX);
    const pictures = sources.filter(isPicture);
    const unsupported = sources
      .filter((source) => !isPicture(source))
      .map((source): SkippedFile => ({ fileName: source.fileName, reason: "unsupported" }));
    this.#enqueue(
      pictures.map((source) => ({ source, skipDuplicate: true })),
      {
        total: this.#state.total + pictures.length,
        skipped: [...this.#state.skipped, ...unsupported],
      },
    );
  }

  /** Takes the pictures skipped as duplicates in after all; they leave the skipped list. */
  addDuplicates(): void {
    if (this.#state.failed) {
      throw new Error("the picture import failed; cancel it or start a new one to add files");
    }
    const duplicates = this.#duplicates;
    this.#duplicates = [];
    this.#enqueue(
      duplicates.map((source) => ({ source, skipDuplicate: false })),
      {
        done: this.#state.done - duplicates.length,
        skipped: this.#state.skipped.filter((skip) => skip.reason !== "duplicate"),
      },
    );
  }

  #enqueue(entries: readonly Queued[], change: Partial<PictureImportState>): void {
    this.#queue.push(...entries);
    this.#update({
      ...change,
      storageFull: false,
      busy: this.#queue.length > 0 || this.#isDraining,
    });
    if (!this.#isDraining && this.#queue.length > 0) {
      this.#isDraining = true;
      this.#draining = this.#drain();
    }
  }

  /**
   * Resolves once every queued file is processed; rejects with `PictureImportFailedError`, or with
   * the unexpected error of a file cancelled in flight.
   */
  settled(): Promise<void> {
    return this.#draining;
  }

  /** Stops after the file in flight and clears the state. */
  cancel(): void {
    this.#generation += 1;
    this.#queue = [];
    this.#duplicates = [];
    if (!this.#isDraining) {
      this.#draining = Promise.resolve();
    }
    this.#update(EMPTY);
  }

  /**
   * An unexpected error fails the import it belongs to. One of a file cancelled in flight leaves
   * the fresh import running and rejects `settled()` once the queue is done, so it still surfaces.
   */
  async #drain(): Promise<void> {
    let cancelledFileError: { readonly error: unknown } | null = null;
    try {
      for (let entry = this.#queue.shift(); entry !== undefined; entry = this.#queue.shift()) {
        const generation = this.#generation;
        const { source } = entry;
        let outcome: Outcome;
        try {
          outcome = await this.#importOne(entry);
        } catch (error) {
          if (generation === this.#generation) {
            throw error;
          }
          cancelledFileError = { error };
          continue;
        }
        if (generation === this.#generation) {
          this.#apply(source, outcome);
        }
      }
    } catch (error) {
      this.#queue = [];
      this.#update({ total: this.#state.done, busy: false, failed: true });
      throw new PictureImportFailedError(error);
    } finally {
      this.#isDraining = false;
    }
    if (cancelledFileError !== null) {
      throw cancelledFileError.error;
    }
  }

  async #importOne({ source, skipDuplicate }: Queued): Promise<Outcome> {
    let identity: PictureIdentity;
    let read: ReadPicture;
    try {
      identity = await source.identify();
      if (skipDuplicate && this.#isDuplicate(identity)) {
        return { kind: "skipped", reason: "duplicate" };
      }
      read = await source.read();
    } catch (error) {
      if (error instanceof UnreadablePictureError) {
        return { kind: "skipped", reason: "unreadable" };
      }
      if (error instanceof PictureNotDownloadedError) {
        return { kind: "skipped", reason: "notDownloaded" };
      }
      throw error;
    }
    const { decoded, focus } = read;
    const id = this.#ports.newId();
    try {
      await this.#ports.store.putPicture(id, {
        display: decoded.display,
        thumbnail: decoded.thumbnail,
      });
      if (focus !== null) {
        await this.#ports.store.putPictureFocus(id, focus);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === QUOTA_EXCEEDED) {
        return { kind: "storageFull" };
      }
      throw error;
    }
    const { width, height } = decoded;
    const { fileName, capturedAt, immichAssetId, fileBytes } = identity;
    const origin = {
      ...(immichAssetId === undefined ? {} : { immichAssetId }),
      ...(fileBytes === undefined ? {} : { fileBytes }),
    };
    return { kind: "stored", picture: { id, capturedAt, width, height, fileName, ...origin } };
  }

  #isDuplicate(identity: PictureIdentity): boolean {
    const known = [...(this.#ports.known ?? []), ...this.#state.pictures];
    return known.some((picture) => isSamePicture(picture, identity));
  }

  #apply(source: PictureSource, outcome: Outcome): void {
    const done = this.#state.done + 1;
    const busy = this.#queue.length > 0;
    switch (outcome.kind) {
      case "stored":
        this.#update({
          done,
          busy,
          pictures: orderByCaptureDate([...this.#state.pictures, outcome.picture]),
        });
        return;
      case "skipped":
        if (outcome.reason === "duplicate") {
          this.#duplicates.push(source);
        }
        this.#update({
          done,
          busy,
          skipped: [...this.#state.skipped, { fileName: source.fileName, reason: outcome.reason }],
        });
        return;
      case "storageFull":
        this.#queue = [];
        this.#update({ total: this.#state.done, storageFull: true, busy: false });
        return;
    }
  }

  #update(change: Partial<PictureImportState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
