import type { LibraryStore, StoredMusic } from "../../library/stored-slideshow";
import type { ServerLibrary } from "../../server-library/server-library";
import type { SlideshowEditor } from "../editing/slideshow-editor";
import { readPickedMusic, type MusicPickPorts, type PendingSong } from "../import/music-pick";

export type { PendingSong } from "../import/music-pick";

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
}

/** What adds songs to a slideshow of either home: reading a picked file and storing its audio. */
export interface SongIntakeDevice extends MusicPickPorts {
  readonly storage: SongStorage;
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
  };
}

/** The server: it keeps the uploaded audio under the id it answers; nothing to spare. */
export function serverSongStorage(server: Pick<ServerLibrary, "uploadMusic">): SongStorage {
  return {
    async store(audio) {
      const id = await server.uploadMusic(audio, audio.type);
      return { id, release: () => Promise.resolve() };
    },
  };
}

/**
 * Songs picked in the music editor: each is read (converted where needed, ADR-0020), its audio
 * stored, and appended to the playlist, one after another in the order picked (ADR-0023). Until
 * then it is pending; an unusable one stays pending until dismissed.
 */
export class SongIntake {
  readonly #ports: SongIntakePorts;
  readonly #onChange: (pending: readonly PendingSong[]) => void;
  readonly #disposed = new AbortController();
  #pending: readonly PendingSong[] = [];
  #nextKey = 0;
  #queue: Promise<void> = Promise.resolve();

  constructor(ports: SongIntakePorts, onChange: (pending: readonly PendingSong[]) => void) {
    this.#ports = ports;
    this.#onChange = onChange;
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

  /** Cancels a conversion under way; files not taken yet are left. */
  dispose(): void {
    this.#disposed.abort();
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
      this.#ports.editor.addSongs([song]);
      this.dismiss(key);
      await this.#ports.editor.settled();
      await audio.release();
    } catch (error) {
      this.dismiss(key);
      if (!signal.aborted) this.#ports.onError(error);
    }
  }

  #replace(key: number, song: PendingSong): void {
    this.#tell(this.#pending.map((pending) => (pending.key === key ? song : pending)));
  }

  #tell(pending: readonly PendingSong[]): void {
    this.#pending = pending;
    this.#onChange(pending);
  }
}
