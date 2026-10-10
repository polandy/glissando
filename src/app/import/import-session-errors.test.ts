import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { PictureImportFailedError } from "../../import/picture-import";
import { pictureFile, sessionWith } from "./testing/import-session-fixtures";

describe("ImportSession, reporting a failed import", () => {
  it("logs a failed import without reporting it again, as step 1 shows it", async () => {
    const store = new MemoryLibraryStore();
    const failure = new Error("disk on fire");
    store.putPicture = () => Promise.reject(failure);
    const { session, errors, logged } = sessionWith(store);

    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await session.pictures.settled().catch(() => undefined);
    await session.reported();

    expect(session.pictures.state.failed).toBe(true);
    expect(logged).toEqual([new PictureImportFailedError(failure)]);
    expect(errors).toEqual([]);
  });

  it("logs a failed import once, however often pictures were added", async () => {
    const store = new MemoryLibraryStore();
    const failure = new Error("disk on fire");
    store.putPicture = () => Promise.reject(failure);
    const { session, logged } = sessionWith(store);

    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    session.addPictures([pictureFile("b.jpg", "2025-07-01T10:00:00Z")]);
    session.addPictures([pictureFile("c.jpg", "2025-07-01T10:00:00Z")]);
    await session.pictures.settled().catch(() => undefined);
    await session.reported();

    expect(session.pictures.state.failed).toBe(true);
    expect(logged).toHaveLength(1);
  });

  it("reports an unexpected error that no step shows: one of a picture cancelled in flight", async () => {
    const failure = new Error("disk on fire");
    let failing = true;
    const store = new MemoryLibraryStore();
    const putPicture = store.putPicture.bind(store);
    store.putPicture = (id, blobs) => (failing ? Promise.reject(failure) : putPicture(id, blobs));
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    const { session, errors, logged } = sessionWith(store, {
      decode: async (file) => {
        await held;
        return { width: 300, height: 200, display: new Blob([file.name]), thumbnail: new Blob([]) };
      },
    });

    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    session.pictures.cancel();
    release();
    await session.pictures.settled().catch(() => undefined);
    failing = false;
    await session.reported();

    expect(session.pictures.state.failed).toBe(false);
    expect(errors).toEqual([failure]);
    expect(logged).toEqual([]);
  });
});
