import { UnreadableMusicError, type MusicProbe } from "../../../import/music-probe";
import { m4a } from "../../../import/testing/music-headers";
import type { StoredMusic } from "../../../library/stored-slideshow";
import {
  SongIntake,
  type PendingSong,
  type SampleSongRow,
  type SongIntakePorts,
} from "../song-intake";

export const mp3 = (name: string): File => new File(["ID3 tune"], name, { type: "audio/mpeg" });
export const appleLossless = (): File =>
  new File([m4a("alac")], "Lanterns.m4a", { type: "audio/mp4" });

/** An editor whose edits are stored at once, or, `holding`, once `store()` is called. */
export class FakeEditor {
  readonly added: StoredMusic[][] = [];
  readonly log: string[];
  /** Resolves once songs were added. */
  readonly whenAdded: Promise<void>;
  #added: () => void = () => {};
  #settle: () => void = () => {};
  #settled = Promise.resolve();

  readonly #holding: boolean;

  constructor(log: string[], holding: boolean) {
    this.log = log;
    this.#holding = holding;
    this.whenAdded = new Promise((resolve) => (this.#added = resolve));
  }

  addSongs(songs: readonly StoredMusic[]): void {
    this.added.push([...songs]);
    this.log.push(`add ${songs.map((song) => song.id).join(",")}`);
    if (this.#holding) this.#settled = new Promise((resolve) => (this.#settle = resolve));
    this.#added();
  }

  settled(): Promise<void> {
    return this.#settled;
  }

  store(): void {
    this.log.push("stored");
    this.#settle();
  }
}

/** A `SongIntake` whose device storage logs `store`/`storeSample`/`release` by name. */
export function intakeWith(overrides: Partial<SongIntakePorts> = {}, { holding = false } = {}) {
  const log: string[] = [];
  const editor = new FakeEditor(log, holding);
  const errors: unknown[] = [];
  const shown: (readonly PendingSong[])[] = [];
  const sampleShown: (readonly SampleSongRow[])[] = [];
  let ids = 0;
  const ports: SongIntakePorts = {
    probeMusic: (file): Promise<MusicProbe> =>
      file.name.endsWith(".broken")
        ? Promise.reject(new UnreadableMusicError(file.name))
        : Promise.resolve({ durationMs: 180_000 }),
    convertMusic: (file, onProgress) => {
      onProgress(0.5);
      return Promise.resolve(new File(["flac"], "Lanterns.flac", { type: "audio/flac" }));
    },
    log: (error) => errors.push(error),
    storage: {
      store: (file) => {
        const id = `song-${(ids += 1)}`;
        log.push(`store ${file.name} as ${id}`);
        return Promise.resolve({
          id,
          release: () => {
            log.push(`release ${id}`);
            return Promise.resolve();
          },
        });
      },
      storeSample: (file, mediaId, alreadyStored) => {
        log.push(`storeSample ${file.name} as ${mediaId} alreadyStored=${String(alreadyStored)}`);
        return Promise.resolve({
          id: mediaId,
          release: () => {
            log.push(`release ${mediaId}`);
            return Promise.resolve();
          },
        });
      },
    },
    editor,
    onError: (error) => errors.push(error),
    ...overrides,
  };
  const intake = new SongIntake(
    ports,
    (pending) => shown.push(pending),
    (rows) => sampleShown.push(rows),
  );
  return { intake, editor, log, errors, shown, sampleShown };
}
