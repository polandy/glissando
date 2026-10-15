import type { ImmichPhoto } from "../../immich/immich-client";
import { localPictureSource, type LocalPictureReaders } from "../../import/local-picture-source";
import {
  PictureImport,
  PictureImportFailedError,
  type DuplicateReason,
} from "../../import/picture-import";
import type { PictureSource } from "../../import/picture-source";
import { localVideoSource, type LocalVideoReaders } from "../../import/local-video-source";
import type { PictureColours, RgbPixel } from "../../library/picture-colours";
import type { PictureIdentity } from "../../library/picture-identity";
import type { LibraryStore } from "../../library/stored-slideshow";
import { linkImmichPhotos } from "../../server-library/link-immich-photos";
import type { PictureChecker } from "../../culling/picture-checker";
import { PictureCulling } from "./picture-culling";
import { PictureRemovals, type PictureRemovalsPorts } from "./picture-removals";

export interface PictureIntakePorts
  extends LocalPictureReaders, Omit<PictureRemovalsPorts, "pictures"> {
  readonly store: Pick<
    LibraryStore,
    "putPicture" | "putPictureFocus" | "putVideo" | "claimMedia" | "releaseClaim"
  >;
  /** What a video file is opened and dated with; its poster is decoded by `decode`. */
  readonly videoClips: Pick<LocalVideoReaders, "openClip" | "captureDate">;
  /** Measures each stored picture's thumbnail for culling (ADR-0024). */
  readonly checker: PictureChecker;
  /** A photo picked in the Immich browser, read through the composition root's client. */
  immichSource(photo: ImmichPhoto): PictureSource;
  /** The decoded display rendition's pixels, sampled for `pictureColours` (ADR-0033). */
  pixels(blob: Blob): Promise<readonly RgbPixel[]>;
  /** A linked Immich photo's colours, read from a thumbnail; nothing else about it is downloaded. */
  immichColours(photo: ImmichPhoto): Promise<PictureColours>;
  /** Claim and media ids. */
  newId(): string;
  now(): Date;
  /** An unexpected error of the picture import, which runs on without a caller to throw to. */
  onError(error: unknown): void;
  /** Records an error the user already sees, such as a failed import shown by the pictures step. */
  log(error: unknown): void;
}

const VIDEO_TYPE_PREFIX = "video/";

/**
 * The pictures being taken in, for a new slideshow or one being added to: files and Immich photos
 * in, stored pictures out, those already `known` skipped as duplicates (ADR-0016). Every media id
 * is claimed in the store before the media is written, so a clean-up in any tab spares it until
 * the claim ends. Each stored picture is checked for similar shots and blur; a set-aside one stays
 * claimed until the import ends, then nothing references it.
 */
export class PictureIntake {
  readonly pictures: PictureImport;
  readonly culling: PictureCulling;
  readonly #ports: PictureIntakePorts;
  readonly #removals: PictureRemovals;
  #known: readonly PictureIdentity[];
  #reporting: Promise<void> = Promise.resolve();
  #reportedDrain: Promise<void> | null = null;
  /** The Immich photos being linked now, their colours not yet read; `settled()` awaits it too. */
  #linking: Promise<void> = Promise.resolve();
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
        putVideo: async (id, blob) => {
          await this.claim(id);
          await ports.store.putVideo(id, blob);
        },
      },
      pixels: ports.pixels,
      newId: ports.newId,
      log: ports.log,
      known: () => this.#known,
      stored: (stored) => {
        // A clip is never a blur or a near-duplicate of a shot (ADR-0034).
        if (stored.picture.video === undefined) this.culling.check(stored);
      },
    });
    this.culling = new PictureCulling({
      checker: ports.checker,
      pictures: this.pictures,
      log: ports.log,
      onError: ports.onError,
    });
    this.#removals = new PictureRemovals({ ...ports, pictures: this.pictures });
  }

  #localSource(file: File): PictureSource {
    return file.type.startsWith(VIDEO_TYPE_PREFIX)
      ? localVideoSource(file, { ...this.#ports.videoClips, decode: this.#ports.decode })
      : localPictureSource(file, this.#ports);
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
    this.#removals.end();
    this.pictures.add(files.map((file) => this.#localSource(file)));
    this.#watchDrain();
  }

  addImmichPhotos(photos: readonly ImmichPhoto[]): void {
    this.#removals.end();
    this.pictures.add(photos.map((photo) => this.#ports.immichSource(photo)));
    this.#watchDrain();
  }

  /**
   * Links Immich photos for a server slideshow: listed at once, their media not downloaded, only
   * each one's colours read off a thumbnail (ADR-0033).
   */
  linkImmichPhotos(photos: readonly ImmichPhoto[]): Promise<void> {
    this.#removals.end();
    const linking = linkImmichPhotos(
      photos,
      this.#known,
      { colours: this.#ports.immichColours },
      this.pictures.state.pictures,
    ).then(({ pictures, skipped }) => {
      this.pictures.link(pictures, skipped);
    });
    // settled() only waits for the linking to finish; its failure is the caller's to handle.
    this.#linking = linking.catch(() => undefined);
    return linking;
  }

  /** Takes the pictures skipped as duplicates for `reason` in after all. */
  addDuplicates(reason: DuplicateReason): void {
    this.#removals.end();
    this.pictures.addDuplicates(reason);
    this.#watchDrain();
  }

  /**
   * Takes a chosen picture out at once, with an undo toast; removals while it shows add up.
   * Choosing more pictures ends the undo, as `endRemovals` does.
   */
  removePicture(pictureId: string): void {
    this.#removals.remove(pictureId);
  }

  /** The removals become final and their toast goes, such as on leaving the pictures step. */
  endRemovals(): void {
    this.#removals.end();
  }

  /**
   * Resolves once every picture queued now is imported and checked, and the cull applied;
   * rejects as `PictureImport.settled` does.
   */
  async settled(): Promise<void> {
    await this.#linking;
    await this.pictures.settled();
    await this.culling.settled();
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
    this.#removals.end();
    this.pictures.cancel();
    this.culling.reset();
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
