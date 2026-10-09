import type { OwnKenBurns } from "./own-ken-burns";
import type { MusicTrim } from "./own-music";
import type { TransitionChoice } from "./own-timing";

/**
 * A slideshow as kept on the device: the user's pictures and music plus the few settings the
 * MVP has. The playable slideshow JSON is composed from it (see `src/compose/`), so every
 * automatic choice follows the current rules.
 */

/** Without music each picture stays this long; the user changes it in half-second steps. */
export const DEFAULT_SECONDS_PER_PICTURE = 5;
export const SECONDS_PER_PICTURE_STEP = 0.5;
export const MIN_SECONDS_PER_PICTURE = 2;
export const MAX_SECONDS_PER_PICTURE = 15;

export interface StoredPicture {
  readonly id: string;
  /** ISO 8601 date-time, capture time from EXIF or the file date. */
  readonly capturedAt: string;
  /** Size of the stored, downscaled picture in pixels. */
  readonly width: number;
  readonly height: number;
  readonly fileName: string;
  /** The user's own motion for this picture; absent while it is automatic (see ADR-0006). */
  readonly kenBurns?: OwnKenBurns;
  /** Shown with the picture in the player; absent: none. Normalised (`normalizeCaption`). */
  readonly caption?: string;
  /** How long the picture shows, in whole ms (`checkOwnDurationMs`); absent: automatic. */
  readonly durationMs?: number;
  /**
   * How the picture hands over to the next one; absent: automatic. Kept on the last picture but
   * not applied there (see ADR-0008).
   */
  readonly transition?: TransitionChoice;
}

export interface StoredMusic {
  readonly id: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly mimeType: string;
  /** The part of the track that plays (`checkMusicTrim`); absent: the whole track (ADR-0009). */
  readonly trim?: MusicTrim;
  /** Own fade-in in whole ms, 0 being off (`checkMusicFadeMs`); absent: automatic. */
  readonly fadeInMs?: number;
  /** Own fade-out in whole ms, 0 being off (`checkMusicFadeMs`); absent: automatic. */
  readonly fadeOutMs?: number;
}

export interface StoredSlideshow {
  readonly id: string;
  readonly title: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
  /** In play order; never empty. */
  readonly pictures: readonly StoredPicture[];
  /** The user reordered the pictures; absent while they keep the capture-date order. */
  readonly ownOrder?: true;
  readonly music?: StoredMusic;
  readonly secondsPerPicture: number;
}

/** A picture's two stored renditions. */
export interface PictureBlobs {
  /** Downscaled to display resolution; what the player shows. */
  readonly display: Blob;
  /** Small rendition for tiles and covers. */
  readonly thumbnail: Blob;
}

/**
 * Persistent storage of slideshows and their media. Media is written while importing, the
 * slideshow record last; media no saved slideshow references is an abandoned import.
 */
export interface LibraryStore {
  putPicture(id: string, blobs: PictureBlobs): Promise<void>;
  putMusic(id: string, blob: Blob): Promise<void>;
  /** Writes the record atomically; replaces one with the same id. */
  saveSlideshow(slideshow: StoredSlideshow): Promise<void>;
  /**
   * Replaces a stored record, reading it in the same transaction: throws
   * `SlideshowNotFoundError` when it is gone, so an edit never brings a deleted slideshow back.
   */
  updateSlideshow(slideshow: StoredSlideshow): Promise<void>;
  /** Newest first. */
  listSlideshows(): Promise<readonly StoredSlideshow[]>;
  /** Throws `SlideshowNotFoundError` for an unknown id. */
  getSlideshow(id: string): Promise<StoredSlideshow>;
  /**
   * Deletes the record and, in the same transaction, the media only it references. Throws
   * `SlideshowNotFoundError` for an unknown id.
   */
  deleteSlideshow(id: string): Promise<void>;
  pictureBlob(id: string): Promise<Blob>;
  thumbnailBlob(id: string): Promise<Blob>;
  musicBlob(id: string): Promise<Blob>;
  /** The bytes the slideshow's pictures (both renditions) and music take; missing media counts 0. */
  mediaBytes(slideshow: StoredSlideshow): Promise<number>;
  /**
   * Claims a media id no saved slideshow references (yet or any more), so a clean-up in any tab
   * spares it: an import in progress claims its media before writing it, a removal its pictures
   * while it can be undone. The first claim under `claimId` records `startedAt`.
   */
  claimMedia(claimId: string, startedAt: Date, mediaId: string): Promise<void>;
  /** The import was created or discarded, the removal undone or final: its media is spared no longer. */
  releaseClaim(claimId: string): Promise<void>;
  /**
   * Deletes media no saved slideshow references, sparing that of claims made less than
   * `CLAIM_SPARED_FOR_MS` before `now`; older claims are taken for crashed and forgotten.
   */
  deleteUnreferencedMedia(now: Date): Promise<void>;
}

/** How long a claim spares its media; a tab that crashed never releases its claims. */
export const CLAIM_SPARED_FOR_MS = 24 * 60 * 60 * 1000;

/** The stored record of a claim: an import in progress or an undoable removal. */
export interface MediaClaim {
  readonly id: string;
  /** ISO 8601. */
  readonly startedAt: string;
  readonly mediaIds: readonly string[];
}

export class SlideshowNotFoundError extends Error {
  constructor(readonly slideshowId: string) {
    super(`no slideshow with id "${slideshowId}" is stored on this device`);
    this.name = "SlideshowNotFoundError";
  }
}

/** Media a store was asked for but does not hold. */
export class MediaNotFoundError extends Error {
  constructor(readonly mediaId: string) {
    super(`no media with id "${mediaId}" is stored on this device`);
    this.name = "MediaNotFoundError";
  }
}
