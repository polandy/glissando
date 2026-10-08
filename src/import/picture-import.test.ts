import { describe, expect, it } from "vitest";
import { MediaNotFoundError, type PictureBlobs } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { UnreadablePictureError, type DecodedPicture } from "./downscale";
import { PictureImport, type PictureImportState } from "./picture-import";

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
    decode: decoder.decode,
    captureDate: options.captureDate ?? captureDates(options.dates ?? {}),
    store,
    newId: sequentialIds(),
  });
  const states: PictureImportState[] = [];
  pictureImport.subscribe((state) => states.push(state));
  return { pictureImport, decoder, store, states };
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
    const { pictureImport, store } = setUp({ dates: { "a.jpg": "2025-07-01T10:00:00Z" } });

    pictureImport.add([picture("a.jpg")]);
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
    const { pictureImport, states } = setUp({
      dates: {
        "c.jpg": "2025-07-03T10:00:00Z",
        "a.jpg": "2025-07-01T10:00:00Z",
        "b.jpg": "2025-07-02T10:00:00Z",
        "0.jpg": "2025-07-01T10:00:00Z",
      },
    });

    pictureImport.add([picture("c.jpg"), picture("a.jpg"), picture("b.jpg"), picture("0.jpg")]);
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
    const { pictureImport } = setUp({ decoder });
    decoder.hold();

    pictureImport.add([picture("a.jpg"), picture("b.jpg")]);

    expect(decoder.decoded).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 2, done: 0, busy: true });
    decoder.open();
    await pictureImport.settled();
    expect(decoder.decoded).toEqual(["a.jpg", "b.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 2, done: 2, busy: false });
  });

  it("appends files added later to the same import", async () => {
    const { pictureImport } = setUp();

    pictureImport.add([picture("a.jpg")]);
    await pictureImport.settled();
    pictureImport.add([picture("b.jpg")]);
    await pictureImport.settled();

    expect(pictureImport.state).toMatchObject({ total: 2, done: 2 });
    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("skips files that are not pictures as unsupported without counting them", async () => {
    const { pictureImport, decoder } = setUp();

    pictureImport.add([picture("notes.txt", "text/plain"), picture("a.jpg")]);

    expect(pictureImport.state.skipped).toEqual([{ fileName: "notes.txt", reason: "unsupported" }]);
    await pictureImport.settled();
    expect(decoder.decoded).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1 });
  });

  it("skips a picture the browser cannot decode as unreadable and goes on", async () => {
    const { pictureImport } = setUp({ decoder: new FakeDecoder(new Set(["broken.jpg"])) });

    pictureImport.add([picture("broken.jpg"), picture("a.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({
      total: 2,
      done: 2,
      skipped: [{ fileName: "broken.jpg", reason: "unreadable" }],
    });
  });

  it("stops at full storage, keeping what was stored and dropping the rest from the total", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport } = setUp({ decoder, store: new FillingStore(1) });

    pictureImport.add([picture("a.jpg"), picture("b.jpg"), picture("c.jpg")]);
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
    const { pictureImport } = setUp({ store: new FillingStore(1) });
    pictureImport.add([picture("a.jpg"), picture("b.jpg")]);
    await pictureImport.settled();

    pictureImport.add([picture("c.jpg")]);

    expect(pictureImport.state).toMatchObject({ total: 2, storageFull: false, busy: true });
    await pictureImport.settled();
    expect(pictureImport.state).toMatchObject({ total: 1, storageFull: true });
  });

  it("cancels after the current file and clears the state", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, store } = setUp({ decoder });
    pictureImport.add([picture("a.jpg")]);
    await pictureImport.settled();
    decoder.hold();
    pictureImport.add([picture("b.jpg"), picture("c.jpg")]);

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
    await store.deleteUnreferencedMedia(new Set());
    for (const id of ["picture-1", "picture-2"]) {
      expect(await store.pictureBlob(id).catch((error: unknown) => error)).toBeInstanceOf(
        MediaNotFoundError,
      );
    }
  });

  it("imports files added after a cancel while the cancelled file was in flight", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport } = setUp({ decoder });
    decoder.hold();
    pictureImport.add([picture("a.jpg")]);
    pictureImport.cancel();

    pictureImport.add([picture("b.jpg")]);
    decoder.open();
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["b.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1, busy: false });
  });

  it("fails loud on an unexpected error: settled rejects and the state reports it", async () => {
    const failure = new Error("the disk went away");
    const { pictureImport } = setUp({ captureDate: () => Promise.reject(failure) });

    pictureImport.add([picture("a.jpg"), picture("b.jpg")]);

    await expect(pictureImport.settled()).rejects.toBe(failure);
    expect(pictureImport.state).toMatchObject({ failed: true, busy: false, total: 0, done: 0 });
    expect(() => pictureImport.add([picture("c.jpg")])).toThrow(/failed/);
  });

  it("stops notifying a listener once it unsubscribes", async () => {
    const { pictureImport } = setUp();
    const seen: number[] = [];
    const unsubscribe = pictureImport.subscribe((state) => seen.push(state.total));

    pictureImport.add([picture("a.jpg")]);
    unsubscribe();
    pictureImport.add([picture("b.jpg")]);
    await pictureImport.settled();

    expect(seen).toEqual([0, 1]);
  });
});
