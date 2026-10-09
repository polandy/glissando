import { describe, expect, it } from "vitest";
import { MediaNotFoundError, type PictureBlobs } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import type { DecodedPicture } from "./downscale";
import { UnreadablePictureError } from "./unreadable-picture";
import { localPictureSource } from "./local-picture-source";
import { PictureImport, PictureImportFailedError, type PictureImportState } from "./picture-import";

const picture = (name: string, type = "image/jpeg"): File => new File([name], name, { type });

/** Decodes every file to a 300×200 picture; files named in `unreadable` fail to decode. */
class FakeDecoder {
  readonly decoded: string[] = [];
  #gate: Promise<void> | null = null;
  #open: (() => void) | null = null;

  constructor(private readonly unreadable: ReadonlySet<string> = new Set()) {}

  /** Holds every decode until `open()`, to act while a file is in flight. */
  hold(): void {
    this.#gate = new Promise((resolve) => (this.#open = resolve));
  }

  open(): void {
    this.#open?.();
    this.#gate = null;
  }

  readonly decode = async (file: File): Promise<DecodedPicture> => {
    this.decoded.push(file.name);
    await this.#gate;
    if (this.unreadable.has(file.name)) {
      throw new UnreadablePictureError(file.name);
    }
    return {
      width: 300,
      height: 200,
      display: new Blob([`${file.name} display`]),
      thumbnail: new Blob([`${file.name} thumbnail`]),
    };
  };
}

/** Capture dates by file name; unknown names default to one shared date. */
const captureDates =
  (dates: Readonly<Record<string, string>>) =>
  (file: File): Promise<string> =>
    Promise.resolve(dates[file.name] ?? "2025-07-01T10:00:00Z");

function sequentialIds(): () => string {
  let next = 1;
  return () => `picture-${next++}`;
}

/** A store that runs out of space from its `limit + 1`-th picture on. */
class FillingStore extends MemoryLibraryStore {
  #stored = 0;
  constructor(private readonly limit: number) {
    super();
  }
  override putPicture(id: string, blobs: PictureBlobs): Promise<void> {
    if (this.#stored >= this.limit) {
      return Promise.reject(new DOMException("the disk is full", "QuotaExceededError"));
    }
    this.#stored += 1;
    return super.putPicture(id, blobs);
  }
}

function setUp(
  options: {
    decoder?: FakeDecoder;
    dates?: Record<string, string>;
    store?: MemoryLibraryStore;
    captureDate?: (file: File) => Promise<string>;
  } = {},
) {
  const decoder = options.decoder ?? new FakeDecoder();
  const store = options.store ?? new MemoryLibraryStore();
  const pictureImport = new PictureImport({
    store,
    newId: sequentialIds(),
  });
  const captureDate = options.captureDate ?? captureDates(options.dates ?? {});
  const addFiles = (files: readonly File[]): void => {
    pictureImport.add(
      files.map((file) => localPictureSource(file, { decode: decoder.decode, captureDate })),
    );
  };
  const states: PictureImportState[] = [];
  pictureImport.subscribe((state) => states.push(state));
  return { pictureImport, addFiles, decoder, store, states };
}

const fileNames = (state: PictureImportState): string[] =>
  state.pictures.map((stored) => stored.fileName);

describe("PictureImport", () => {
  it("starts empty and idle", () => {
    const { states } = setUp();

    expect(states).toEqual([
      {
        total: 0,
        done: 0,
        pictures: [],
        skipped: [],
        storageFull: false,
        busy: false,
        failed: false,
      },
    ]);
  });

  it("stores each picture and lists it with its capture date and display size", async () => {
    const { pictureImport, addFiles, store } = setUp({
      dates: { "a.jpg": "2025-07-01T10:00:00Z" },
    });

    addFiles([picture("a.jpg")]);
    await pictureImport.settled();

    expect(pictureImport.state).toEqual({
      total: 1,
      done: 1,
      pictures: [
        {
          id: "picture-1",
          capturedAt: "2025-07-01T10:00:00Z",
          width: 300,
          height: 200,
          fileName: "a.jpg",
        },
      ],
      skipped: [],
      storageFull: false,
      busy: false,
      failed: false,
    });
    expect(await (await store.pictureBlob("picture-1")).text()).toBe("a.jpg display");
    expect(await (await store.thumbnailBlob("picture-1")).text()).toBe("a.jpg thumbnail");
  });

  it("keeps the pictures ordered by capture date, ties by file name, as they arrive", async () => {
    const { pictureImport, addFiles, states } = setUp({
      dates: {
        "c.jpg": "2025-07-03T10:00:00Z",
        "a.jpg": "2025-07-01T10:00:00Z",
        "b.jpg": "2025-07-02T10:00:00Z",
        "0.jpg": "2025-07-01T10:00:00Z",
      },
    });

    addFiles([picture("c.jpg"), picture("a.jpg"), picture("b.jpg"), picture("0.jpg")]);
    await pictureImport.settled();

    const progress = states.filter((state) => state.done > 0).map(fileNames);
    expect(progress).toEqual([
      ["c.jpg"],
      ["a.jpg", "c.jpg"],
      ["a.jpg", "b.jpg", "c.jpg"],
      ["0.jpg", "a.jpg", "b.jpg", "c.jpg"],
    ]);
  });

  it("processes one file at a time and reports k of N while busy", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({ decoder });
    decoder.hold();

    addFiles([picture("a.jpg"), picture("b.jpg")]);

    expect(decoder.decoded).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 2, done: 0, busy: true });
    decoder.open();
    await pictureImport.settled();
    expect(decoder.decoded).toEqual(["a.jpg", "b.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 2, done: 2, busy: false });
  });

  it("appends files added later to the same import", async () => {
    const { pictureImport, addFiles } = setUp();

    addFiles([picture("a.jpg")]);
    await pictureImport.settled();
    addFiles([picture("b.jpg")]);
    await pictureImport.settled();

    expect(pictureImport.state).toMatchObject({ total: 2, done: 2 });
    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("skips files that are not pictures as unsupported without counting them", async () => {
    const { pictureImport, addFiles, decoder } = setUp();

    addFiles([picture("notes.txt", "text/plain"), picture("a.jpg")]);

    expect(pictureImport.state.skipped).toEqual([{ fileName: "notes.txt", reason: "unsupported" }]);
    await pictureImport.settled();
    expect(decoder.decoded).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1 });
  });

  it("skips a picture the browser cannot decode as unreadable and goes on", async () => {
    const { pictureImport, addFiles } = setUp({
      decoder: new FakeDecoder(new Set(["broken.jpg"])),
    });

    addFiles([picture("broken.jpg"), picture("a.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({
      total: 2,
      done: 2,
      skipped: [{ fileName: "broken.jpg", reason: "unreadable" }],
    });
  });

  it("skips a picture the browser cannot read as unreadable and goes on", async () => {
    const { pictureImport, addFiles } = setUp({
      captureDate: (file) =>
        file.name === "lapsed.jpg"
          ? Promise.reject(new UnreadablePictureError(file.name))
          : Promise.resolve("2025-07-01T10:00:00Z"),
    });

    addFiles([picture("lapsed.jpg"), picture("a.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({
      total: 2,
      done: 2,
      skipped: [{ fileName: "lapsed.jpg", reason: "unreadable" }],
      failed: false,
    });
  });

  it("stops at full storage, keeping what was stored and dropping the rest from the total", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({ decoder, store: new FillingStore(1) });

    addFiles([picture("a.jpg"), picture("b.jpg"), picture("c.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({
      total: 1,
      done: 1,
      storageFull: true,
      busy: false,
    });
    expect(decoder.decoded).toEqual(["a.jpg", "b.jpg"]);
  });

  it("tries again when files are added after storage was full", async () => {
    const { pictureImport, addFiles } = setUp({ store: new FillingStore(1) });
    addFiles([picture("a.jpg"), picture("b.jpg")]);
    await pictureImport.settled();

    addFiles([picture("c.jpg")]);

    expect(pictureImport.state).toMatchObject({ total: 2, storageFull: false, busy: true });
    await pictureImport.settled();
    expect(pictureImport.state).toMatchObject({ total: 1, storageFull: true });
  });

  it("cancels after the current file and clears the state", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles, store } = setUp({ decoder });
    addFiles([picture("a.jpg")]);
    await pictureImport.settled();
    decoder.hold();
    addFiles([picture("b.jpg"), picture("c.jpg")]);

    pictureImport.cancel();

    expect(pictureImport.state).toEqual({
      total: 0,
      done: 0,
      pictures: [],
      skipped: [],
      storageFull: false,
      busy: false,
      failed: false,
    });
    decoder.open();
    await pictureImport.settled();
    expect(decoder.decoded).toEqual(["a.jpg", "b.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 0, pictures: [] });
    expect(await (await store.pictureBlob("picture-2")).text()).toBe("b.jpg display");
    await store.deleteUnreferencedMedia(new Date("2026-10-08T12:00:00Z"));
    for (const id of ["picture-1", "picture-2"]) {
      expect(await store.pictureBlob(id).catch((error: unknown) => error)).toBeInstanceOf(
        MediaNotFoundError,
      );
    }
  });

  it("imports files added after a cancel while the cancelled file was in flight", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({ decoder });
    decoder.hold();
    addFiles([picture("a.jpg")]);
    pictureImport.cancel();

    addFiles([picture("b.jpg")]);
    decoder.open();
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["b.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1, busy: false });
  });

  it("an unexpected error of a file cancelled in flight leaves the fresh import unfailed", async () => {
    const failure = new Error("the disk went away");
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({
      decoder,
      captureDate: (file) =>
        file.name === "a.jpg" ? Promise.reject(failure) : captureDates({})(file),
    });
    decoder.hold();
    addFiles([picture("a.jpg")]);
    pictureImport.cancel();
    addFiles([picture("b.jpg")]);

    decoder.open();

    await expect(pictureImport.settled()).rejects.toBe(failure);
    expect(fileNames(pictureImport.state)).toEqual(["b.jpg"]);
    expect(pictureImport.state).toMatchObject({ failed: false, busy: false, total: 1, done: 1 });
  });

  it("fails loud on an unexpected error: settled rejects with it as the failed import's cause, and the state reports it", async () => {
    const failure = new Error("the disk went away");
    const { pictureImport, addFiles } = setUp({ captureDate: () => Promise.reject(failure) });

    addFiles([picture("a.jpg"), picture("b.jpg")]);

    const rejection: unknown = await pictureImport.settled().catch((error: unknown) => error);
    expect(rejection).toBeInstanceOf(PictureImportFailedError);
    expect((rejection as PictureImportFailedError).cause).toBe(failure);
    expect(pictureImport.state).toMatchObject({ failed: true, busy: false, total: 0, done: 0 });
    expect(() => addFiles([picture("c.jpg")])).toThrow(/failed/);
  });

  it("starts over after a failed import is cancelled and accepts new files", async () => {
    let failing = true;
    const failure = new Error("the disk went away");
    const { pictureImport, addFiles } = setUp({
      captureDate: () =>
        failing ? Promise.reject(failure) : Promise.resolve("2025-07-01T10:00:00Z"),
    });
    addFiles([picture("a.jpg")]);
    await expect(pictureImport.settled()).rejects.toBeInstanceOf(PictureImportFailedError);

    failing = false;
    pictureImport.cancel();
    addFiles([picture("b.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["b.jpg"]);
    expect(pictureImport.state).toMatchObject({ failed: false, total: 1, done: 1 });
  });

  it("stops notifying a listener once it unsubscribes", async () => {
    const { pictureImport, addFiles } = setUp();
    const seen: number[] = [];
    const unsubscribe = pictureImport.subscribe((state) => seen.push(state.total));

    addFiles([picture("a.jpg")]);
    unsubscribe();
    addFiles([picture("b.jpg")]);
    await pictureImport.settled();

    expect(seen).toEqual([0, 1]);
  });
});
