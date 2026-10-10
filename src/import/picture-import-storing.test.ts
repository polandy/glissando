import { describe, expect, it } from "vitest";
import type { PictureImportState } from "./picture-import";
import { FakeDecoder, fileNames, picture, setUp } from "./testing/picture-import-fixtures";

describe("PictureImport, storing pictures", () => {
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
          fileBytes: 5,
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
    await decoder.reached;

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

  it("stops notifying a listener once it unsubscribes", async () => {
    const { pictureImport, addFiles } = setUp();
    const seen: number[] = [];
    const unsubscribe = pictureImport.subscribe((state: PictureImportState) =>
      seen.push(state.total),
    );

    addFiles([picture("a.jpg")]);
    unsubscribe();
    addFiles([picture("b.jpg")]);
    await pictureImport.settled();

    expect(seen).toEqual([0, 1]);
  });
});
