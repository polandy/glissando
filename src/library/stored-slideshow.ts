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
}

export interface StoredMusic {
  readonly id: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly mimeType: string;
}

export interface StoredSlideshow {
  readonly id: string;
  readonly title: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
  /** In play order. */
  readonly pictures: readonly StoredPicture[];
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
  /** Newest first. */
  listSlideshows(): Promise<readonly StoredSlideshow[]>;
  /** Throws `SlideshowNotFoundError` for an unknown id. */
  getSlideshow(id: string): Promise<StoredSlideshow>;
  pictureBlob(id: string): Promise<Blob>;
  thumbnailBlob(id: string): Promise<Blob>;
  musicBlob(id: string): Promise<Blob>;
  /**
   * Claims a media id for an import in progress, before the media is written, so a clean-up in
   * any tab spares it. The first claim of an import records `startedAt`.
   */
  recordImportMedia(importId: string, startedAt: Date, mediaId: string): Promise<void>;
  /** The import was created or discarded: its media is spared no longer. */
  endImport(importId: string): Promise<void>;
  /**
   * Deletes media no saved slideshow references, sparing that of imports started less than
   * `IMPORT_SPARED_FOR_MS` before `now`; older imports are taken for crashed and forgotten.
   */
  deleteUnreferencedMedia(now: Date): Promise<void>;
}

/** How long an import in progress spares its media; a tab that crashed never ends its import. */
export const IMPORT_SPARED_FOR_MS = 24 * 60 * 60 * 1000;

/** The stored record of an import in progress. */
export interface ImportInProgress {
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
