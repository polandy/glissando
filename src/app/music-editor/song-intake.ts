import type { LibraryStore, StoredMusic } from "../../library/stored-slideshow";
import type { ServerLibrary } from "../../server-library/server-library";
import type { SlideshowEditor } from "../editing/slideshow-editor";
import { readPickedMusic, type MusicPickPorts, type PendingSong } from "../import/music-pick";
import {
  pickSampleTrack,
  sampleTrackIsAdded,
  type SampleSongPickPorts,
  type SampleSongRow,
} from "../sample-music/sample-song-pick";
import {
  sampleMediaId,
  type SampleTrack,
  type SampleTrackId,
} from "../../sample-music/sample-tracks";

export type { PendingSong } from "../import/music-pick";
export type { SampleSongRow } from "../sample-music/sample-song-pick";

/** A song's audio, stored where its slideshow lives. */
export interface StoredSongAudio {
  /** The song's id, which its audio is stored under. */
  readonly id: string;
  /** The song is in the stored playlist: its media needs sparing from clean-up no longer. */
  release(): Promise<void>;
}

/** Where a slideshow keeps its songs' audio: the device's store, or the server. */
export interface SongStorage {
  store(audio: File): Promise<StoredSongAudio>;
  /**
   * Stores a sample track (SAMPLE_MUSIC.md) under its fixed media id, so the device holds it
   * once however many slideshows play it; `alreadyStored` writes no new bytes there. The server
   * ignores both and uploads under its own id, like any other song.
   */
  storeSample(audio: File, mediaId: string, alreadyStored: boolean): Promise<StoredSongAudio>;
}

/** What adds songs to a slideshow of either home: reading a picked file and storing its audio. */
export interface SongIntakeDevice extends MusicPickPorts {
  readonly storage: SongStorage;
  /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md): no track can be added. */
  readonly sampleMusic?: SampleSongPickPorts;
}

export interface SongIntakePorts extends SongIntakeDevice {
  readonly editor: Pick<SlideshowEditor, "addSongs" | "settled">;
  onError(error: unknown): void;
}

/**
 * The device's store: the audio is claimed before it is written, so a clean-up in any tab spares
 * it until the playlist that references it is stored.
 */
export function deviceSongStorage(ports: {
  readonly store: Pick<LibraryStore, "claimMedia" | "releaseClaim" | "putMusic">;
  newId(): string;
  now(): Date;
}): SongStorage {
  const { store, newId, now } = ports;
  return {
    async store(audio) {
      const id = newId();
      const claimId = newId();
      await store.claimMedia(claimId, now(), id);
      await store.putMusic(id, audio);
      return { id, release: () => store.releaseClaim(claimId) };
    },
    async storeSample(audio, mediaId, alreadyStored) {
      const claimId = newId();
      await store.claimMedia(claimId, now(), mediaId);
      if (!alreadyStored) await store.putMusic(mediaId, audio);
      return { id: mediaId, release: () => store.releaseClaim(claimId) };
    },
  };
}

/** The server: it keeps the uploaded audio under the id it answers; nothing to spare. */
export function serverSongStorage(server: Pick<ServerLibrary, "uploadMusic">): SongStorage {
  const store = async (audio: File): Promise<StoredSongAudio> => {
    const id = await server.uploadMusic(audio, audio.type);
    return { id, release: () => Promise.resolve() };
  };
  return { store, storeSample: (audio) => store(audio) };
}

/**
 * Songs picked in the music editor: each is read (converted where needed, ADR-0020), its audio
 * stored, and appended to the playlist, one after another in the order picked (ADR-0023). Until
 * then it is pending; an unusable one stays pending until dismissed.
 */
export class SongIntake {
  readonly #ports: SongIntakePorts;
  readonly #onChange: (pending: readonly PendingSong[]) => void;
  readonly #onSampleRowsChange: (rows: readonly SampleSongRow[]) => void;
  readonly #disposed = new AbortController();
  #pending: readonly PendingSong[] = [];
  #sampleRows: readonly SampleSongRow[] = [];
  /** One download per track id: a track already in `#sampleRows` is never added twice. */
  readonly #sampleDownloads = new Map<SampleTrackId, AbortController>();
  #nextKey = 0;
  #queue: Promise<void> = Promise.resolve();

  constructor(
    ports: SongIntakePorts,
    onChange: (pending: readonly PendingSong[]) => void,
    onSampleRowsChange: (rows: readonly SampleSongRow[]) => void = () => undefined,
  ) {
    this.#ports = ports;
    this.#onChange = onChange;
    this.#onSampleRowsChange = onSampleRowsChange;
  }

  /** Resolves once every song picked so far is in the playlist, found unusable or reported. */
  add(files: readonly File[]): Promise<void> {
    const keyed = files.map((file) => ({ file, key: (this.#nextKey += 1) }));
    this.#tell([
      ...this.#pending,
      ...keyed.map(({ file, key }) => ({ key, kind: "reading" as const, pickedName: file.name })),
    ]);
    for (const { file, key } of keyed) {
      this.#queue = this.#queue.then(() => this.#take(file, key));
    }
    return this.#queue;
  }

  /** Takes an unusable file's row away. */
  dismiss(key: number): void {
    this.#tell(this.#pending.filter((song) => song.key !== key));
  }

  /** Whether `trackId` is downloading or has failed; not the editor's own stored playlist. */
  isSampleTrackAdded(trackId: SampleTrackId): boolean {
    return sampleTrackIsAdded(this.#sampleRows, trackId);
  }

  /**
   * Adds a sample track (SAMPLE_MUSIC.md): reused from this device without a download, or
   * downloaded and checked, its row reporting progress until it is in the playlist or has
   * failed. A track already downloading or failed is left alone.
   */
  async addSampleTrack(track: SampleTrack): Promise<void> {
    if (this.isSampleTrackAdded(track.id)) return;
    const sampleMusic = this.#ports.sampleMusic;
    if (sampleMusic === undefined) {
      throw new Error("cannot add a sample track: sample music is disabled for this build");
    }
    // A failed row (never a downloading one: `isSampleTrackAdded` ruled that out above) is
    // replaced by the retry, so Add never leaves two rows for the same track.
    this.#tellSampleRows([
      ...this.#sampleRows.filter((row) => row.trackId !== track.id),
      { kind: "downloadingSample", trackId: track.id, title: track.title, progress: 0 },
    ]);
    const controller = new AbortController();
    this.#sampleDownloads.set(track.id, controller);
    await this.#takeSampleTrack(track, sampleMusic, controller.signal);
  }

  /** Takes the row holding `trackId` away, cancelling its download. */
  removeSampleTrack(trackId: SampleTrackId): void {
    this.#sampleDownloads.get(trackId)?.abort();
    this.#sampleDownloads.delete(trackId);
    this.#dropSampleRow(trackId);
  }

  /** Cancels a conversion under way; files not taken yet are left. */
  dispose(): void {
    this.#disposed.abort();
    for (const download of this.#sampleDownloads.values()) download.abort();
  }

  async #take(file: File, key: number): Promise<void> {
    const signal = this.#disposed.signal;
    if (signal.aborted) return;
    try {
      const read = await readPickedMusic(
        file,
        this.#ports,
        (converting) => this.#replace(key, { key, ...converting }),
        signal,
      );
      if (read.kind === "unusable") {
        this.#replace(key, { key, ...read });
        return;
      }
      const audio = await this.#ports.storage.store(read.file);
      const song: StoredMusic = {
        id: audio.id,
        fileName: read.file.name,
        durationMs: read.durationMs,
        mimeType: read.file.type,
      };
      try {
        this.#ports.editor.addSongs([song]);
        this.dismiss(key);
        await this.#ports.editor.settled();
      } finally {
        await audio.release();
      }
    } catch (error) {
      this.dismiss(key);
      if (!signal.aborted) this.#ports.onError(error);
    }
  }

  async #takeSampleTrack(
    track: SampleTrack,
    sampleMusic: SampleSongPickPorts,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const result = await pickSampleTrack(
        track,
        sampleMusic,
        (progress) =>
          this.#replaceSampleRow({
            kind: "downloadingSample",
            trackId: track.id,
            title: track.title,
            progress,
          }),
        signal,
      );
      if (signal.aborted || result.kind === "aborted") return;
      if (result.kind === "failed") {
        this.#replaceSampleRow({
          kind: "failedSampleDownload",
          trackId: track.id,
          title: track.title,
        });
        return;
      }
      const audio = await this.#ports.storage.storeSample(
        result.file,
        sampleMediaId(track.id),
        result.kind === "onDevice",
      );
      const song: StoredMusic = {
        id: audio.id,
        fileName: result.file.name,
        durationMs: track.durationMs,
        mimeType: result.file.type,
        sampleTrack: track.id,
      };
      try {
        this.#ports.editor.addSongs([song]);
        this.#dropSampleRow(track.id);
        await this.#ports.editor.settled();
      } finally {
        await audio.release();
      }
    } catch (error) {
      this.#dropSampleRow(track.id);
      if (!signal.aborted) this.#ports.onError(error);
    } finally {
      this.#sampleDownloads.delete(track.id);
    }
  }

  /** Updates the row for `row.trackId`; one removed meanwhile (`removeSampleTrack`) stays out. */
  #replaceSampleRow(row: SampleSongRow): void {
    if (!this.#sampleDownloads.has(row.trackId)) return;
    this.#tellSampleRows(
      this.#sampleRows.map((candidate) => (candidate.trackId === row.trackId ? row : candidate)),
    );
  }

  #dropSampleRow(trackId: SampleTrackId): void {
    this.#tellSampleRows(this.#sampleRows.filter((row) => row.trackId !== trackId));
  }

  #tellSampleRows(rows: readonly SampleSongRow[]): void {
    this.#sampleRows = rows;
    this.#onSampleRowsChange(rows);
  }

  #replace(key: number, song: PendingSong): void {
    this.#tell(this.#pending.map((pending) => (pending.key === key ? song : pending)));
  }

  #tell(pending: readonly PendingSong[]): void {
    this.#pending = pending;
    this.#onChange(pending);
  }
}
