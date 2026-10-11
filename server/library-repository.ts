import type { MusicBeats } from "../src/beats/music-beats";
import type { ServerDocument } from "../src/server-library/server-document";

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

export interface LibraryRepository {
  /** Runs `work` as one transaction: every write it makes, or none when it throws. */
  inTransaction<Result>(work: () => Result): Result;
  /** Newest `createdAt` first; of two created at the same time, the later one first. */
  listSlideshows(): SlideshowRecord[];
  findSlideshow(id: string): SlideshowRecord | undefined;
  insertSlideshow(record: SlideshowRecord): void;
  /** Replaces the document and revision of the slideshow `id`, which exists. */
  updateSlideshow(id: string, revision: number, document: ServerDocument): void;
  deleteSlideshow(id: string): void;
  findMusic(id: string): MusicRecord | undefined;
  insertMusic(record: MusicRecord): void;
  /** Deletes the music `id` and the beats found for it, if any. */
  deleteMusic(id: string): void;
  /** The beats found for the music `id`, or `undefined` while no device has listened yet. */
  findMusicBeats(id: string): MusicBeats | undefined;
  /** Replaces the beats found for the music `id` (two devices may race; same detector, same answer). */
  putMusicBeats(id: string, beats: MusicBeats): void;
  /** Whether a slideshow's document names the music `id`. */
  isMusicReferenced(id: string): boolean;
  /** The ids of music no slideshow names, uploaded before `time`. */
  unreferencedMusicUploadedBefore(time: number): string[];
}
