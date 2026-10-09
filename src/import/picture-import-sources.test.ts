import { describe, expect, it } from "vitest";
import { ImmichRequestFailedError } from "../immich/immich-client";
import type { PictureFocus } from "../library/picture-focus";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { immichPictureSource } from "./immich-picture-source";
import { PictureImport } from "./picture-import";
import { PictureNotDownloadedError, type PictureSource, type ReadPicture } from "./picture-source";

const FACE: PictureFocus = { kind: "subject", box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 } };

const readPicture = (fileName: string, focus: PictureFocus | null): ReadPicture => ({
  decoded: {
    width: 300,
    height: 200,
    display: new Blob([`${fileName} display`]),
    thumbnail: new Blob([`${fileName} thumbnail`]),
  },
  capturedAt: "2025-07-01T10:00:00Z",
  focus,
});

const source = (fileName: string, read: () => Promise<ReadPicture>): PictureSource => ({
  fileName,
  mimeType: "image/jpeg",
  read,
});

const withFocus = (fileName: string, focus: PictureFocus | null): PictureSource =>
  source(fileName, () => Promise.resolve(readPicture(fileName, focus)));

/** A store whose focus writes run out of space. */
class FullFocusStore extends MemoryLibraryStore {
  override putPictureFocus(): Promise<void> {
    return Promise.reject(new DOMException("the disk is full", "QuotaExceededError"));
  }
}

function setUp(store = new MemoryLibraryStore()) {
  let next = 1;
  const pictureImport = new PictureImport({ store, newId: () => `picture-${next++}` });
  return { pictureImport, store };
}

describe("PictureImport with a picture source", () => {
  it("stores the focus a source brings with its picture", async () => {
    const { pictureImport, store } = setUp();

    pictureImport.add([withFocus("face.jpg", FACE)]);
    await pictureImport.settled();

    expect(pictureImport.state.pictures.map((picture) => picture.fileName)).toEqual(["face.jpg"]);
    expect(await store.pictureFocus(["picture-1"])).toEqual(new Map([["picture-1", FACE]]));
  });

  it("stores no focus for a source that brings none, leaving it to the on-device pass", async () => {
    const { pictureImport, store } = setUp();

    pictureImport.add([withFocus("plain.jpg", null)]);
    await pictureImport.settled();

    expect(pictureImport.state.pictures.map((picture) => picture.fileName)).toEqual(["plain.jpg"]);
    expect(await store.pictureFocus(["picture-1"])).toEqual(new Map());
  });

  it("skips a picture that could not be downloaded as not downloaded and goes on", async () => {
    const { pictureImport } = setUp();
    const gone = source("gone.jpg", () =>
      Promise.reject(new PictureNotDownloadedError("gone.jpg", { cause: new Error("offline") })),
    );

    pictureImport.add([gone, withFocus("a.jpg", null)]);
    await pictureImport.settled();

    expect(pictureImport.state.pictures.map((picture) => picture.fileName)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({
      total: 2,
      done: 2,
      skipped: [{ fileName: "gone.jpg", reason: "notDownloaded" }],
      failed: false,
    });
  });

  it("skips a photo deleted in Immich after browsing as not downloaded and goes on", async () => {
    const { pictureImport } = setUp();
    const client = {
      original: (photoId: string) =>
        photoId === "deleted"
          ? Promise.reject(new ImmichRequestFailedError(`GET api/assets/${photoId}/original`, 404))
          : Promise.resolve(new Blob([photoId], { type: "image/jpeg" })),
      thumbnail: () => Promise.reject(new Error("no preview is needed")),
      faces: () => Promise.resolve([]),
    };
    const fromImmich = (id: string) =>
      immichPictureSource(
        { id, fileName: `${id}.jpg`, takenAt: "2025-07-01T10:00:00Z" },
        {
          client,
          decode: (file) => Promise.resolve(readPicture(file.name, null).decoded),
          reportUnavailable: () => undefined,
          log: () => undefined,
        },
      );

    pictureImport.add([fromImmich("deleted"), fromImmich("kept")]);
    await pictureImport.settled();

    expect(pictureImport.state.pictures.map((picture) => picture.fileName)).toEqual(["kept.jpg"]);
    expect(pictureImport.state).toMatchObject({
      done: 2,
      skipped: [{ fileName: "deleted.jpg", reason: "notDownloaded" }],
      failed: false,
    });
  });

  it("stops at full storage when there is no room for a picture's focus", async () => {
    const { pictureImport } = setUp(new FullFocusStore());

    pictureImport.add([
      withFocus("a.jpg", null),
      withFocus("face.jpg", FACE),
      withFocus("b.jpg", null),
    ]);
    await pictureImport.settled();

    expect(pictureImport.state).toMatchObject({
      total: 1,
      done: 1,
      storageFull: true,
      busy: false,
      failed: false,
    });
    expect(pictureImport.state.pictures.map((picture) => picture.fileName)).toEqual(["a.jpg"]);
  });

  it("skips a source that is not a picture as unsupported without reading it", async () => {
    const { pictureImport } = setUp();
    let read = false;
    const notes: PictureSource = {
      fileName: "notes.txt",
      mimeType: "text/plain",
      read: () => {
        read = true;
        return Promise.resolve(readPicture("notes.txt", null));
      },
    };

    pictureImport.add([withFocus("a.jpg", null), notes]);
    await pictureImport.settled();

    expect(pictureImport.state.pictures.map((picture) => picture.fileName)).toEqual(["a.jpg"]);
    expect(pictureImport.state.skipped).toEqual([{ fileName: "notes.txt", reason: "unsupported" }]);
    expect(read).toBe(false);
  });
});
