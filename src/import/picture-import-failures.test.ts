import { describe, expect, it } from "vitest";
import { MediaNotFoundError } from "../library/stored-slideshow";
import { PictureImportFailedError } from "./picture-import";
import { UnreadablePictureError } from "./unreadable-picture";
import {
  FakeDecoder,
  FillingStore,
  captureDates,
  fileNames,
  picture,
  setUp,
} from "./testing/picture-import-fixtures";

describe("PictureImport, failures: unreadable files, full storage, cancel", () => {
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
});
