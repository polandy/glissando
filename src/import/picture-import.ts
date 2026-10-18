import { orderByCaptureDate } from "../compose";
import type { StoredPicture } from "../library/stored-slideshow";
import { applyOutcome } from "./picture-import-apply";
import { duplicateReason, importOne, type Outcome, type Queued } from "./picture-import-outcome";
import {
  FILES_PICK,
  newPick,
  pickStopped,
  pickToStop,
  picksTruncated,
  type ImportPick,
  type PickInput,
} from "./picture-import-picks";
import type { PictureSource } from "./picture-source";
import {
  PictureImportFailedError,
  type DuplicateReason,
  type PictureImportPorts,
  type SkippedFile,
} from "./picture-import-types";

export type { ImportPick, PickInput, PickKind } from "./picture-import-picks";
export {
  PictureImportFailedError,
  type DuplicateReason,
  type PictureImportPorts,
  type SkippedFile,
  type SkipReason,
  type StoredWithThumbnail,
} from "./picture-import-types";

export interface PictureImportState {
  /** Picture files accepted so far; files dropped at full storage leave the count. */
  readonly total: number;
  /** Accepted files processed, stored or skipped, so progress "done of total" reaches total. */
  readonly done: number;
  /** By capture date ascending, ties by file name. */
  readonly pictures: readonly StoredPicture[];
  /** One per `add()` call (or Immich selection), in pick order. */
  readonly picks: readonly ImportPick[];
  readonly skipped: readonly SkippedFile[];
  readonly storageFull: boolean;
  readonly busy: boolean;
  /** An unexpected error ended the import; `settled()` rejects with it. */
  readonly failed: boolean;
}

const PICTURE_TYPE_PREFIXES = ["image/", "video/"];

const EMPTY: PictureImportState = {
  total: 0,
  done: 0,
  pictures: [],
  picks: [],
  skipped: [],
  storageFull: false,
  busy: false,
  failed: false,
};

/**
 * Step 1 of creating a slideshow, or adding to one: pictures from files or Immich in, stored
 * downscaled pictures out, one at a time so memory stays bounded on phones. A picture the known
 * ones or this import already have is skipped as a duplicate before it is read (ADR-0016). Media
 * stored by a cancelled import is left unreferenced for `LibraryStore.deleteUnreferencedMedia`.
 */
export class PictureImport {
  readonly #ports: PictureImportPorts;
  readonly #listeners = new Set<(state: PictureImportState) => void>();
  #state = EMPTY;
  #queue: Queued[] = [];
  /** The sources skipped as duplicates, for `addDuplicates`. */
  #duplicates: { readonly source: PictureSource; readonly reason: DuplicateReason }[] = [];
  #draining: Promise<void> = Promise.resolve();
  #isDraining = false;
  /** Bumped by `cancel()`, so the file in flight at that moment is discarded. */
  #generation = 0;
  /** Names each pick, counting up so ids stay stable across tests regardless of media ids. */
  #nextPickId = 0;
  /** A pick stopped while its file in flight was still being read; that file is dropped once done. */
  readonly #stoppedPickIds = new Set<string>();

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

  /** `pick` names the files for the queue's progress display; default: an unnamed files pick. */
  add(sources: readonly PictureSource[], pick: PickInput = FILES_PICK): void {
    if (this.#state.failed) {
      throw new Error("the picture import failed; cancel it or start a new one to add files");
    }
    const isPicture = (source: PictureSource): boolean =>
      PICTURE_TYPE_PREFIXES.some((prefix) => source.mimeType.startsWith(prefix));
    const pictures = sources.filter(isPicture);
    const unsupported = sources
      .filter((source) => !isPicture(source))
      .map((source): SkippedFile => ({ fileName: source.fileName, reason: "unsupported" }));
    this.#nextPickId += 1;
    const pickId = `pick-${this.#nextPickId}`;
    this.#enqueue(
      pictures.map((source) => ({ source, skipDuplicate: true, pickId })),
      {
        total: this.#state.total + pictures.length,
        skipped: [...this.#state.skipped, ...unsupported],
        picks: [...this.#state.picks, newPick(pickId, pick, pictures.length)],
      },
    );
  }

  /**
   * Drops the pick's waiting files from the queue and the overall total; its pictures already
   * stored stay. A file of it already being read finishes but is then dropped, as if it had
   * never been picked (`PICTURE_IMPORT.md`).
   */
  stop(pickId: string): void {
    pickToStop(this.#state.picks, pickId);
    const waiting = this.#queue.filter((entry) => entry.pickId === pickId).length;
    this.#queue = this.#queue.filter((entry) => entry.pickId !== pickId);
    this.#stoppedPickIds.add(pickId);
    this.#update({
      total: this.#state.total - waiting,
      picks: pickStopped(this.#state.picks, pickId),
      busy: this.#queue.length > 0 || this.#isDraining,
    });
  }

  /** Takes the pictures skipped as duplicates for `reason` in after all; they leave the skipped list. */
  addDuplicates(reason: DuplicateReason): void {
    if (this.#state.failed) {
      throw new Error("the picture import failed; cancel it or start a new one to add files");
    }
    const taken = this.#duplicates.filter((duplicate) => duplicate.reason === reason);
    this.#duplicates = this.#duplicates.filter((duplicate) => duplicate.reason !== reason);
    this.#enqueue(
      taken.map(({ source }) => ({ source, skipDuplicate: false })),
      {
        done: this.#state.done - taken.length,
        skipped: this.#state.skipped.filter((skip) => skip.reason !== reason),
      },
    );
  }

  /**
   * Lists pictures that are linked rather than stored, such as Immich photos of a server
   * slideshow, with those skipped while linking them; nothing is read or written.
   */
  link(pictures: readonly StoredPicture[], skipped: readonly SkippedFile[]): void {
    const count = pictures.length + skipped.length;
    this.#update({
      total: this.#state.total + count,
      done: this.#state.done + count,
      pictures: orderByCaptureDate([...this.#state.pictures, ...pictures]),
      skipped: [...this.#state.skipped, ...skipped],
    });
  }

  /**
   * Takes a stored picture out again; it leaves done and total, and no longer counts as a
   * duplicate. Its media stays for `restore` until the import's media is cleaned up.
   */
  remove(pictureId: string): StoredPicture {
    const removed = this.#state.pictures.find((stored) => stored.id === pictureId);
    if (removed === undefined) {
      throw new Error(`the import has no picture "${pictureId}" to remove`);
    }
    this.#update({
      total: this.#state.total - 1,
      done: this.#state.done - 1,
      pictures: this.#state.pictures.filter((stored) => stored !== removed),
    });
    return removed;
  }

  /** Puts removed pictures back, in capture-date order like every picture. */
  restore(pictures: readonly StoredPicture[]): void {
    this.#update({
      total: this.#state.total + pictures.length,
      done: this.#state.done + pictures.length,
      pictures: orderByCaptureDate([...this.#state.pictures, ...pictures]),
    });
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

  /** Resolves once every queued file is processed; rejects with `PictureImportFailedError`. */
  settled(): Promise<void> {
    return this.#draining;
  }

  /** Stops after the file in flight and clears the state. */
  cancel(): void {
    this.#generation += 1;
    this.#queue = [];
    this.#duplicates = [];
    this.#stoppedPickIds.clear();
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
          this.#apply(entry, outcome);
        }
      }
    } catch (error) {
      this.#queue = [];
      this.#update({
        total: this.#state.done,
        picks: picksTruncated(this.#state.picks),
        busy: false,
        failed: true,
      });
      throw new PictureImportFailedError(error);
    } finally {
      this.#isDraining = false;
    }
    if (cancelledFileError !== null) {
      throw cancelledFileError.error;
    }
  }

  #importOne(entry: Queued): Promise<Outcome> {
    return importOne(entry, this.#ports, (identity) =>
      duplicateReason(identity, this.#ports.known?.() ?? [], this.#state.pictures),
    );
  }

  #apply(entry: Queued, outcome: Outcome): void {
    const busy = this.#queue.length > 0;
    const wasStopped = entry.pickId !== undefined && this.#stoppedPickIds.delete(entry.pickId);
    const result = applyOutcome(this.#state, busy, entry, outcome, wasStopped);
    if (outcome.kind === "storageFull") {
      this.#queue = [];
    }
    if (result.stored !== undefined) {
      this.#ports.stored?.(result.stored);
    }
    if (result.duplicate !== undefined) {
      this.#duplicates.push(result.duplicate);
    }
    this.#update(result.change);
  }

  #update(change: Partial<PictureImportState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
