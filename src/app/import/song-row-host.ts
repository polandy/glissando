import type { ImportSong } from "./import-session";

/**
 * What managing a row of step 2's song list needs from `ImportSession`'s own list and keys,
 * shared by a picked file's read (picked-song-intake.ts) and a sample track's download
 * (sample-track-intake.ts).
 */
export interface SongRowHost {
  songs(): readonly ImportSong[];
  setSongs(songs: readonly ImportSong[]): void;
  /** A fresh key, shared by every row in the list. */
  nextKey(): number;
  /** Starts tracking `key`'s cancellation; returns its signal. */
  beginRead(key: number): AbortSignal;
  readSignal(key: number): AbortSignal | undefined;
  /** Takes the row out of the list, cancelling its read. */
  removeSong(key: number): void;
}

/** Updates the row at `key`; one removed meanwhile (its read cancelled) stays out. */
export function replaceRow(host: SongRowHost, key: number, song: ImportSong): void {
  if (host.readSignal(key)?.aborted !== false) return;
  host.setSongs(host.songs().map((candidate) => (candidate.key === key ? song : candidate)));
}
