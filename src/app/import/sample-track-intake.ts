import type { StoredMusic } from "../../library/stored-slideshow";
import {
  sampleMediaId,
  type SampleTrack,
  type SampleTrackId,
} from "../../sample-music/sample-tracks";
import {
  pickSampleTrack,
  sampleTrackIsAdded,
  sampleTrackRow,
  type SampleSongPickPorts,
  type SampleSongRow,
} from "../sample-music/sample-song-pick";
import type { ChosenSong } from "./import-session";
import { replaceRow, type SongRowHost } from "./song-row-host";

/** Whether `trackId` already has a row: downloading or chosen (SAMPLE_MUSIC.md). */
export function isSampleTrackAdded(host: SongRowHost, trackId: SampleTrackId): boolean {
  return sampleTrackIsAdded(host.songs(), trackId);
}

/**
 * Adds a sample track (SAMPLE_MUSIC.md): reused from this device without a download, or
 * downloaded and checked, its row reporting progress until it is chosen or fails. A track
 * already in the list, downloading or chosen, is left alone.
 */
export async function addSampleTrack(
  host: SongRowHost,
  track: SampleTrack,
  sampleMusic: SampleSongPickPorts | undefined,
): Promise<void> {
  if (isSampleTrackAdded(host, track.id)) return;
  if (sampleMusic === undefined) {
    throw new Error("cannot add a sample track: sample music is disabled for this build");
  }
  // A failed row (never a downloading or chosen one: `isSampleTrackAdded` ruled those out above)
  // is replaced by the retry, so Add never leaves two rows for the same track.
  const withoutFailed = host
    .songs()
    .filter((song) => song !== sampleTrackRow(host.songs(), track.id));
  const key = host.nextKey();
  host.setSongs([
    ...withoutFailed,
    { key, kind: "downloadingSample", trackId: track.id, title: track.title, progress: 0 },
  ]);
  const signal = host.beginRead(key);
  await takeSampleTrack(host, track, sampleMusic, key, signal);
}

/** Takes the row holding `trackId` out of the list, cancelling its download. */
export function removeSampleTrack(host: SongRowHost, trackId: SampleTrackId): void {
  const row = sampleTrackRow(host.songs(), trackId);
  if (row !== undefined) host.removeSong(row.key);
}

async function takeSampleTrack(
  host: SongRowHost,
  track: SampleTrack,
  sampleMusic: SampleSongPickPorts,
  key: number,
  signal: AbortSignal,
): Promise<void> {
  const row = (progress: number): SampleSongRow => ({
    kind: "downloadingSample",
    trackId: track.id,
    title: track.title,
    progress,
  });
  try {
    const result = await pickSampleTrack(
      track,
      sampleMusic,
      (progress) => replaceRow(host, key, { key, ...row(progress) }),
      signal,
    );
    if (signal.aborted || result.kind === "aborted") return;
    if (result.kind === "failed") {
      replaceRow(host, key, {
        key,
        kind: "failedSampleDownload",
        trackId: track.id,
        title: track.title,
      });
      return;
    }
    replaceRow(host, key, {
      key,
      kind: "chosen",
      file: result.file,
      pickedName: result.file.name,
      durationMs: track.durationMs,
      convertedFrom: null,
      sample: { trackId: track.id, alreadyStored: result.kind === "onDevice" },
    });
  } catch (error) {
    if (signal.aborted) return;
    host.removeSong(key);
    throw error;
  }
}

/** What storing the chosen songs' audio needs from the device: a claim, a write, a fresh id. */
export interface ChosenSongStorage {
  putMusic(id: string, audio: File): Promise<void>;
  claim(id: string): Promise<void>;
  newId(): string;
}

/**
 * Claimed for the import before written, one after another in the list's order. A sample track
 * already on this device writes no new bytes, under its fixed media id (SAMPLE_MUSIC.md).
 */
export async function storeChosenSongs(
  songs: readonly ChosenSong[],
  storage: ChosenSongStorage,
): Promise<StoredMusic[]> {
  const stored: StoredMusic[] = [];
  for (const song of songs) {
    const id = song.sample === undefined ? storage.newId() : sampleMediaId(song.sample.trackId);
    await storage.claim(id);
    if (song.sample === undefined || !song.sample.alreadyStored) {
      await storage.putMusic(id, song.file);
    }
    stored.push(songRecord(id, song));
  }
  return stored;
}

export function songRecord(id: string, song: ChosenSong): StoredMusic {
  return {
    id,
    fileName: song.file.name,
    durationMs: song.durationMs,
    mimeType: song.file.type,
    ...(song.sample === undefined ? {} : { sampleTrack: song.sample.trackId }),
  };
}
