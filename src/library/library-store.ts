import type { MusicBeats } from "../beats";
import type { MusicLoudness } from "../loudness";
import type { StoredFocus } from "./picture-focus";
import type { StoredSlideshow } from "./stored-slideshow";

/**
 * The persistence port: what the device's `LibraryStore` offers, and the narrower
 * `SlideshowStore` the library, a slideshow's screen, its editors, the player and the exports
 * need (the server's store has it too).
 */

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
  /** Stores a video's original file under its media id (`StoredVideo.mediaId`). */
  putVideo(id: string, blob: Blob): Promise<void>;
  /** Writes the record atomically; replaces one with the same id. */
  saveSlideshow(slideshow: StoredSlideshow): Promise<void>;
  /**
   * Replaces a stored record, reading it in the same transaction: throws
   * `SlideshowNotFoundError` when it is gone, so an edit never brings a deleted slideshow back.
   */
  updateSlideshow(slideshow: StoredSlideshow): Promise<void>;
  /**
   * Replaces the stored record `id` with `edit` of it, read and written in one transaction, so
   * nothing written meanwhile is lost; resolves with the result. Throws `SlideshowNotFoundError`
   * when it is gone, and `edit`'s own error with the record left as it was.
   */
  updateSlideshowWith(
    id: string,
    edit: (current: StoredSlideshow) => StoredSlideshow,
  ): Promise<StoredSlideshow>;
  /** Newest first. */
  listSlideshows(): Promise<readonly StoredSlideshow[]>;
  /** Throws `SlideshowNotFoundError` for an unknown id. */
  getSlideshow(id: string): Promise<StoredSlideshow>;
  /**
   * Deletes the record and, in the same transaction, the media (pictures, music, videos) only it
   * references, those pictures' focus and that music's beats and loudness. Throws
   * `SlideshowNotFoundError` for an unknown id.
   */
  deleteSlideshow(id: string): Promise<void>;
  /** `signal` cancels a download where reading the picture needs one. */
  pictureBlob(id: string, signal?: AbortSignal): Promise<Blob>;
  /** The picture as the player shows it: on the device, its display rendition. */
  playbackPictureBlob(id: string, signal?: AbortSignal): Promise<Blob>;
  thumbnailBlob(id: string): Promise<Blob>;
  musicBlob(id: string): Promise<Blob>;
  /** Whether the `music` store holds `id`, re-checked every call (a slideshow may be deleted meanwhile). */
  hasMusic(id: string): Promise<boolean>;
  /** Throws `MediaNotFoundError` for an unknown media id. */
  videoBlob(id: string): Promise<Blob>;
  /**
   * Stores what the detection found in a picture and the detector version that found it, beside
   * its media (ADR-0012, ADR-0041). A picture whose media is not stored (any more) keeps nothing,
   * so a late detection cannot resurrect it.
   */
  putPictureFocus(pictureId: string, focus: StoredFocus): Promise<void>;
  /** The stored focus of each picture asked for; a picture not looked at yet is absent. */
  pictureFocus(pictureIds: readonly string[]): Promise<ReadonlyMap<string, StoredFocus>>;
  /**
   * Stores the beats the detection found in a track, beside its media (ADR-0021). A track whose
   * media is not stored (any more) keeps nothing, so a late detection cannot resurrect it.
   */
  putMusicBeats(musicId: string, beats: MusicBeats): Promise<void>;
  /** The stored beats of a track; `undefined` while it was not listened to yet. */
  musicBeats(musicId: string): Promise<MusicBeats | undefined>;
  /**
   * Stores the loudness measured for a track, beside its media (dev-docs/library/MUSIC.md). A
   * track whose media is not stored (any more) keeps nothing, so a late measurement cannot
   * resurrect it.
   */
  putMusicLoudness(musicId: string, loudness: MusicLoudness): Promise<void>;
  /** The stored loudness of a track; `undefined` while it was not measured yet (played unlevelled). */
  musicLoudness(musicId: string): Promise<MusicLoudness | undefined>;
  /** The bytes the slideshow's pictures (both renditions), music and videos take; missing media counts 0. */
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
   * Deletes media (pictures with their focus, music with its beats, videos) no saved slideshow references, sparing that of
   * claims made less than `CLAIM_SPARED_FOR_MS` before `now`; older claims are taken for crashed
   * and forgotten.
   */
  deleteUnreferencedMedia(now: Date): Promise<void>;
}

/**
 * What the library, a slideshow's screen, its editors, the player and the exports need of a
 * store: the device's `LibraryStore` has it, and so has the server's (`ServerSlideshowStore`).
 */
export type SlideshowStore = Pick<
  LibraryStore,
  | "listSlideshows"
  | "getSlideshow"
  | "updateSlideshow"
  | "updateSlideshowWith"
  | "deleteSlideshow"
  | "pictureBlob"
  | "playbackPictureBlob"
  | "thumbnailBlob"
  | "musicBlob"
  | "pictureFocus"
  | "putPictureFocus"
>;

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
