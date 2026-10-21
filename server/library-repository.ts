import type { MusicBeats } from "../src/beats/music-beats";
import type { MusicLoudness } from "../src/loudness/measure-loudness";
import type { StoredFocus } from "../src/library/picture-focus";
import type { ServerDocument } from "../src/server-library/server-document";

/** What a `putPictureFocus` did: replaced the stored focus, or kept a newer one already there. */
export type PutPictureFocusOutcome = "stored" | "newerKept";

/**
 * Where the library service keeps slideshows and music: a SQLite database in the data volume,
 * or memory in tests. Both adapters pass `repository-contract.ts`. Times are milliseconds since
 * the epoch, from the service's clock.
 */

export interface SlideshowRecord {
  readonly id: string;
  readonly revision: number;
  readonly createdAt: number;
  readonly document: ServerDocument;
}

export interface MusicRecord {
  readonly id: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
  readonly uploadedAt: number;
}

/** A slideshow's share link (`dev-docs/SHARE_LINK.md`); at most one per slideshow. */
export interface ShareLink {
  readonly token: string;
  readonly createdAt: number;
}

export interface LibraryRepository {
  /** Runs `work` as one transaction: every write it makes, or none when it throws. */
  inTransaction<Result>(work: () => Result): Result;
  /** Newest `createdAt` first; of two created at the same time, the later one first. */
  listSlideshows(): SlideshowRecord[];
  findSlideshow(id: string): SlideshowRecord | undefined;
  insertSlideshow(record: SlideshowRecord): void;
  /** Replaces the document and revision of the slideshow `id`, which exists. */
  updateSlideshow(id: string, revision: number, document: ServerDocument): void;
  /** Deletes the slideshow `id` and its share link. */
  deleteSlideshow(id: string): void;
  /** Gives the slideshow `id`, which exists and has no share link, the share link `link`. */
  share(id: string, link: ShareLink): void;
  /** Deletes the share link of the slideshow `id`, if it has one. */
  unshare(id: string): void;
  shareOf(id: string): ShareLink | undefined;
  /** The slideshow whose share link has `token`, if one has. */
  slideshowByShareToken(token: string): SlideshowRecord | undefined;
  findMusic(id: string): MusicRecord | undefined;
  insertMusic(record: MusicRecord): void;
  /** Deletes the music `id` and the beats and loudness found for it, if any. */
  deleteMusic(id: string): void;
  /** The beats found for the music `id`, or `undefined` while no device has listened yet. */
  findMusicBeats(id: string): MusicBeats | undefined;
  /** Replaces the beats found for the music `id` (two devices may race; same detector, same answer). */
  putMusicBeats(id: string, beats: MusicBeats): void;
  /** The loudness measured for the music `id`, or `undefined` while not measured yet. */
  findMusicLoudness(id: string): MusicLoudness | undefined;
  /** Replaces the loudness measured for the music `id` (two devices may race; same pass, same answer). */
  putMusicLoudness(id: string, loudness: MusicLoudness): void;
  /** Whether a slideshow's document names the music `id`. */
  isMusicReferenced(id: string): boolean;
  /**
   * Starts the grace period of the music `id` again at `time`, as though it were uploaded then:
   * music a slideshow just dropped lives as long as unreferenced fresh uploads.
   */
  restartMusicGrace(id: string, time: number): void;
  /** The ids of music no slideshow names, uploaded (or its grace restarted) before `time`. */
  unreferencedMusicUploadedBefore(time: number): string[];
  /** The stored focus of each picture asset id in `assetIds` that has one (ADR-0041). */
  findPictureFocus(assetIds: readonly string[]): ReadonlyMap<string, StoredFocus>;
  /**
   * Stores `stored` for the picture asset `id`, found at `foundAt`: replaces when the stored
   * detector is at most the new one, keeps the newer one otherwise (two devices may race; same
   * detector, same answer).
   */
  putPictureFocus(id: string, stored: StoredFocus, foundAt: number): PutPictureFocusOutcome;
  /** Whether a slideshow's document names the picture asset `id`. */
  isPictureReferenced(id: string): boolean;
  /** Deletes the stored focus of the picture asset `id`, if any. */
  deletePictureFocus(id: string): void;
}
