import { describe, expect, it } from "vitest";
import { MediaNotFoundError } from "../../library/stored-slideshow";
import {
  CREATED_AT,
  LoggingStore,
  FACE,
  pictureFile,
  sessionWith,
  withTwoPictures,
} from "./testing/import-session-fixtures";

describe("ImportSession, how it claims and stores its media", () => {
  it("claims every media id for the import before writing the media, and ends the import once created", async () => {
    const store = new LoggingStore();
    const { session } = sessionWith(store);
    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await session.pictures.settled();
    await session.chooseMusic(new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" }));

    await session.create("de");

    expect(store.log).toEqual([
      "claim id-2",
      "picture id-2",
      "claim id-3",
      "music id-3",
      "slideshow",
      "end id-1",
    ]);
  });

  it("adds photos from Immich to the same import, claimed before stored, with their focus", async () => {
    const store = new LoggingStore();
    const { session } = sessionWith(store);
    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    session.addImmichPhotos([
      { id: "asset-1", fileName: "IMG_0001.HEIC", takenAt: "2025-06-01T10:00:00Z", size: null },
    ]);
    await session.pictures.settled();

    expect(session.pictures.state.pictures.map((picture) => picture.fileName)).toEqual([
      "IMG_0001.HEIC",
      "a.jpg",
    ]);
    expect(store.log).toEqual(["claim id-2", "picture id-2", "claim id-3", "picture id-3"]);
    expect(await store.pictureFocus(["id-3"])).toEqual(new Map([["id-3", FACE]]));
  });

  it("spares the pictures of the running import from a clean-up", async () => {
    const { session, store } = await withTwoPictures();
    const [first] = session.pictures.state.pictures;

    await store.deleteUnreferencedMedia(CREATED_AT);

    expect(await (await store.pictureBlob(first?.id ?? "")).text()).toMatch(/display/);
  });

  it("discarding ends the import, so the next clean-up deletes its pictures", async () => {
    const { session, store } = await withTwoPictures();
    const [first] = session.pictures.state.pictures;

    await session.discard();
    await store.deleteUnreferencedMedia(CREATED_AT);

    expect(
      await store.pictureBlob(first?.id ?? "").catch((error: unknown) => error),
    ).toBeInstanceOf(MediaNotFoundError);
  });

  it("starts a new import after a discard", async () => {
    const store = new LoggingStore();
    const { session } = sessionWith(store);
    await session.discard();
    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await session.pictures.settled();

    await session.discard();

    expect(store.log.filter((entry) => entry.startsWith("end"))).toEqual(["end id-1", "end id-2"]);
  });
});
