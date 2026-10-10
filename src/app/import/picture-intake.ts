import type { ImmichPhoto } from "../../immich/immich-client";
import { localPictureSource, type LocalPictureReaders } from "../../import/local-picture-source";
import {
  PictureImport,
  PictureImportFailedError,
  type DuplicateReason,
} from "../../import/picture-import";
import type { PictureSource } from "../../import/picture-source";
import type { PictureIdentity } from "../../library/picture-identity";
import type { LibraryStore } from "../../library/stored-slideshow";

export interface PictureIntakePorts extends LocalPictureReaders {
  readonly store: Pick<
    LibraryStore,
    "putPicture" | "putPictureFocus" | "claimMedia" | "releaseClaim"
  >;
  /** A photo picked in the Immich browser, read through the composition root's client. */
  immichSource(photo: ImmichPhoto): PictureSource;
  /** Claim and media ids. */
  newId(): string;
  now(): Date;
  /** An unexpected error of the picture import, which runs on without a caller to throw to. */
  onError(error: unknown): void;
  /** Records an error the user already sees, such as a failed import shown by the pictures step. */
  log(error: unknown): void;
}

/**
 * The pictures being taken in, for a new slideshow or one being added to: files and Immich photos
 * in, stored pictures out, those already `known` skipped as duplicates (ADR-0016). Every media id
 * is claimed in the store before the media is written, so a clean-up in any tab spares it until
 * the claim ends.
 */
export class PictureIntake {
  readonly pictures: PictureImport;
  readonly #ports: PictureIntakePorts;
  #known: readonly PictureIdentity[];
  #reporting: Promise<void> = Promise.resolve();
  #reportedDrain: Promise<void> | null = null;
  #claimId: string;
  /** Set by the first claim; a claim that covers nothing is never recorded. */
  #startedAt: Date | null = null;

  constructor(ports: PictureIntakePorts, known: readonly PictureIdentity[] = []) {
    this.#ports = ports;
    this.#known = known;
    this.#claimId = ports.newId();
    this.pictures = new PictureImport({
      store: {
        putPicture: async (id, blobs) => {
          await this.claim(id);
          await ports.store.putPicture(id, blobs);
        },
        putPictureFocus: (id, focus) => ports.store.putPictureFocus(id, focus),
      },
      newId: ports.newId,
      known: () => this.#known,
    });
  }

  /** The pictures already there, such as the slideshow's being added to. */
  get known(): readonly PictureIdentity[] {
    return this.#known;
  }

  /** The pictures already there now; the pictures read from here on are compared with them. */
  replaceKnown(known: readonly PictureIdentity[]): void {
    this.#known = known;
  }

  addPictures(files: readonly File[]): void {
    this.pictures.add(files.map((file) => localPictureSource(file, this.#ports)));
    this.#watchDrain();
  }

  addImmichPhotos(photos: readonly ImmichPhoto[]): void {
    this.pictures.add(photos.map((photo) => this.#ports.immichSource(photo)));
    this.#watchDrain();
  }

  /** Takes the pictures skipped as duplicates for `reason` in after all. */
  addDuplicates(reason: DuplicateReason): void {
    this.pictures.addDuplicates(reason);
    this.#watchDrain();
  }

  /** Resolves once an unexpected picture-import error, if any, has been reported or logged. */
  reported(): Promise<void> {
    return this.#reporting;
  }

  /** Spares `mediaId` from every tab's clean-up until the claim ends. */
  claim(mediaId: string): Promise<void> {
    this.#startedAt ??= this.#ports.now();
    return this.#ports.store.claimMedia(this.#claimId, this.#startedAt, mediaId);
  }

  /** The pictures are kept or discarded: the store spares them no longer; a new claim starts. */
  endClaim(): Promise<void> {
    const ended = this.#claimId;
    this.#claimId = this.#ports.newId();
    this.#startedAt = null;
    return this.#ports.store.releaseClaim(ended);
  }

  /**
   * Forgets the pictures and starts over; resolves once the store spares their media no longer,
   * so the clean-up that follows deletes it.
   */
  discard(): Promise<void> {
    this.pictures.cancel();
    return this.endClaim();
  }

  #watchDrain(): void {
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
}
