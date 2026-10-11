import { describe, expect, it } from "vitest";
import { UnreadableMusicError, type MusicProbe } from "../../import/music-probe";
import type { StoredMusic } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { m4a } from "../../import/testing/music-headers";
import {
  deviceSongStorage,
  serverSongStorage,
  SongIntake,
  type PendingSong,
  type SongIntakePorts,
} from "./song-intake";

const mp3 = (name: string): File => new File(["ID3 tune"], name, { type: "audio/mpeg" });
const appleLossless = (): File => new File([m4a("alac")], "Lanterns.m4a", { type: "audio/mp4" });

/** An editor whose edits are stored at once, or, `holding`, once `store()` is called. */
class FakeEditor {
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

function intakeWith(overrides: Partial<SongIntakePorts> = {}, { holding = false } = {}) {
  const log: string[] = [];
  const editor = new FakeEditor(log, holding);
  const errors: unknown[] = [];
  const shown: (readonly PendingSong[])[] = [];
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
    },
    editor,
    onError: (error) => errors.push(error),
    ...overrides,
  };
  const intake = new SongIntake(ports, (pending) => shown.push(pending));
  return { intake, editor, log, errors, shown };
}

describe("SongIntake", () => {
  it("stores every picked song and appends them to the playlist in the order picked", async () => {
    const { intake, editor } = intakeWith();

    await intake.add([mp3("Morning Drive.mp3"), mp3("Low Tide.mp3")]);

    expect(editor.added).toEqual([
      [
        {
          id: "song-1",
          fileName: "Morning Drive.mp3",
          durationMs: 180_000,
          mimeType: "audio/mpeg",
        },
      ],
      [{ id: "song-2", fileName: "Low Tide.mp3", durationMs: 180_000, mimeType: "audio/mpeg" }],
    ]);
  });

  it("shows every picked song as pending until it is in the playlist", async () => {
    const { intake, shown } = intakeWith();

    await intake.add([mp3("Morning Drive.mp3"), mp3("Low Tide.mp3")]);

    expect(shown[0]?.map(({ pickedName, kind }) => `${pickedName} ${kind}`)).toEqual([
      "Morning Drive.mp3 reading",
      "Low Tide.mp3 reading",
    ]);
    expect(shown.at(-1)).toEqual([]);
  });

  it("shows how far a song's FLAC copy is, and adds the copy", async () => {
    const { intake, editor, shown } = intakeWith();
    const alac = appleLossless();

    await intake.add([alac]);

    expect(shown.flat()).toContainEqual(
      expect.objectContaining({ kind: "converting", pickedName: "Lanterns.m4a", progress: 0.5 }),
    );
    expect(editor.added[0]?.[0]?.fileName).toBe("Lanterns.flac");
  });

  it("keeps an unusable file as a pending row naming it, adding nothing, until dismissed", async () => {
    const { intake, editor, shown } = intakeWith();

    await intake.add([new File(["x"], "Concert.broken")]);

    const row = shown.at(-1)?.[0];
    expect(row).toEqual(
      expect.objectContaining({
        kind: "unusable",
        pickedName: "Concert.broken",
        reason: "unreadable",
      }),
    );
    expect(editor.added).toEqual([]);
    intake.dismiss(row?.key ?? -1);
    expect(shown.at(-1)).toEqual([]);
  });

  it("spares a song's media until the editor has stored the playlist with it", async () => {
    const { intake, editor, log } = intakeWith({}, { holding: true });

    const adding = intake.add([mp3("Morning Drive.mp3")]);
    await editor.whenAdded;
    expect(log).not.toContain("release song-1");
    editor.store();
    await adding;

    expect(log).toEqual([
      "store Morning Drive.mp3 as song-1",
      "add song-1",
      "stored",
      "release song-1",
    ]);
  });

  it("releases a stored song's media when the editor fails to add it, and reports the failure", async () => {
    const failure = new Error("editor gone");
    const { intake, log, errors } = intakeWith({
      editor: {
        addSongs: () => {
          throw failure;
        },
        settled: () => Promise.resolve(),
      },
    });

    await intake.add([mp3("Morning Drive.mp3")]);

    expect(errors).toEqual([failure]);
    expect(log).toEqual(["store Morning Drive.mp3 as song-1", "release song-1"]);
  });

  it("reports a song that could not be stored and drops its pending row", async () => {
    const failure = new Error("disk full");
    const { intake, editor, errors, shown } = intakeWith({
      storage: { store: () => Promise.reject(failure) },
    });

    await intake.add([mp3("Morning Drive.mp3")]);

    expect(errors).toEqual([failure]);
    expect(editor.added).toEqual([]);
    expect(shown.at(-1)).toEqual([]);
  });

  it("cancels a conversion when disposed, adding nothing", async () => {
    const { intake, editor, errors } = intakeWith({
      convertMusic: (_file, _onProgress, signal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason)),
        ),
    });
    const alac = appleLossless();

    const adding = intake.add([alac, mp3("Low Tide.mp3")]);
    intake.dispose();
    await adding;

    expect(editor.added).toEqual([]);
    expect(errors).toEqual([]);
  });
});

describe("deviceSongStorage", () => {
  it("claims the song's media before storing its audio, and releases the claim", async () => {
    const store = new MemoryLibraryStore();
    const claims: string[] = [];
    let ids = 0;
    const storage = deviceSongStorage({
      store: {
        claimMedia: (claimId, _at, mediaId) => {
          claims.push(`claim ${claimId} ${mediaId}`);
          return Promise.resolve();
        },
        releaseClaim: (claimId) => {
          claims.push(`release ${claimId}`);
          return Promise.resolve();
        },
        putMusic: (id, blob) => store.putMusic(id, blob),
      },
      newId: () => `id-${(ids += 1)}`,
      now: () => new Date("2026-10-11T12:00:00Z"),
    });

    const stored = await storage.store(mp3("Morning Drive.mp3"));
    await stored.release();

    expect(stored.id).toBe("id-1");
    expect(await (await store.musicBlob("id-1")).text()).toBe("ID3 tune");
    expect(claims).toEqual(["claim id-2 id-1", "release id-2"]);
  });
});

describe("serverSongStorage", () => {
  it("uploads the song's audio and takes the server's id for it", async () => {
    const uploads: string[] = [];
    const storage = serverSongStorage({
      uploadMusic: async (audio, mimeType) => {
        uploads.push(`${await audio.text()} ${mimeType}`);
        return "music-7";
      },
    });

    const stored = await storage.store(mp3("Morning Drive.mp3"));
    await stored.release();

    expect(stored.id).toBe("music-7");
    expect(uploads).toEqual(["ID3 tune audio/mpeg"]);
  });
});
