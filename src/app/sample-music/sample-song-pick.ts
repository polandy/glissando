import {
  downloadSampleTrack,
  type SampleDownloadPorts,
  type SampleDownloadResult,
} from "../../sample-music/sample-download";
import {
  sampleFileName,
  sampleMediaId,
  type SampleTrack,
  type SampleTrackId,
} from "../../sample-music/sample-tracks";

/** What picking a sample track needs: a download and the on-device check (SAMPLE_MUSIC.md). */
export interface SampleSongPickPorts extends SampleDownloadPorts {
  readonly baseUrl: string;
  hasMusic(id: string): Promise<boolean>;
  musicBlob(id: string): Promise<Blob>;
}

export type SampleSongPickResult =
  | { readonly kind: "onDevice"; readonly file: File }
  | { readonly kind: "downloaded"; readonly file: File }
  | { readonly kind: "aborted" }
  | { readonly kind: "failed"; readonly cause: SampleDownloadResult };

/** A sample track's row while it downloads, keyed and titled for the song list (SAMPLE_MUSIC.md). */
export interface DownloadingSampleSong {
  readonly kind: "downloadingSample";
  readonly trackId: SampleTrackId;
  readonly title: string;
  /** From 0 to 1. */
  readonly progress: number;
}

/** A sample track whose download failed; offered again until its row is taken away. */
export interface FailedSampleDownload {
  readonly kind: "failedSampleDownload";
  readonly trackId: SampleTrackId;
  readonly title: string;
}

export type SampleSongRow = DownloadingSampleSong | FailedSampleDownload;

/** Where a chosen sample track's bytes came from, carried to where it is stored. */
export interface SampleOrigin {
  readonly trackId: SampleTrackId;
  /** The device already held the track: storing it writes no new bytes. */
  readonly alreadyStored: boolean;
}

/** A row that may be a sample track: a chosen song carries `sample`, or a `SampleSongRow` itself. */
type SampleRowLike =
  | SampleSongRow
  | { readonly kind: string; readonly trackId?: undefined; readonly sample?: SampleOrigin };

/** Whether `trackId` already has a row among `songs`: downloading, or chosen (SAMPLE_MUSIC.md). */
export function sampleTrackIsAdded<Song extends SampleRowLike>(
  songs: readonly Song[],
  trackId: SampleTrackId,
): boolean {
  return songs.some(
    (song) =>
      (song.kind === "downloadingSample" && song.trackId === trackId) ||
      (song.kind === "chosen" && song.sample?.trackId === trackId),
  );
}

/** The row (chosen, downloading or failed) holding `trackId` among `songs`, if any. */
export function sampleTrackRow<Song extends SampleRowLike>(
  songs: readonly Song[],
  trackId: SampleTrackId,
): Song | undefined {
  return songs.find(
    (song) =>
      ((song.kind === "downloadingSample" || song.kind === "failedSampleDownload") &&
        song.trackId === trackId) ||
      (song.kind === "chosen" && song.sample?.trackId === trackId),
  );
}

/**
 * Reuses the device's copy of `track` without a download, or downloads and checks it
 * (ADR-0042); either way the result is a `File` named and typed as a picked MP3 would be, so it
 * takes the same path into a playlist as one. `onProgress` reports a download's fraction from 0
 * to 1; an on-device track never calls it.
 */
export async function pickSampleTrack(
  track: SampleTrack,
  ports: SampleSongPickPorts,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<SampleSongPickResult> {
  const mediaId = sampleMediaId(track.id);
  if (await ports.hasMusic(mediaId)) {
    const blob = await ports.musicBlob(mediaId);
    return { kind: "onDevice", file: toSampleFile(track, blob) };
  }
  const result = await downloadSampleTrack(
    track,
    ports.baseUrl,
    ports,
    (receivedBytes, totalBytes) => onProgress(totalBytes === 0 ? 1 : receivedBytes / totalBytes),
    signal,
  );
  if (result.kind === "aborted") return { kind: "aborted" };
  if (result.kind !== "success") return { kind: "failed", cause: result };
  return { kind: "downloaded", file: toSampleFile(track, new Blob([result.bytes])) };
}

function toSampleFile(track: SampleTrack, blob: Blob): File {
  return new File([blob], sampleFileName(track), { type: "audio/mpeg" });
}
