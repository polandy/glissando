import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import {
  choicesOf,
  immichPhoto,
  pictureFile,
  sessionWith,
  withTwoPictures,
} from "./testing/import-session-fixtures";

describe("ImportSession, a slideshow on the Glissando server", () => {
  it("lives on this device until told otherwise", () => {
    expect(choicesOf(sessionWith().session).home).toBe("device");
  });

  it("links Immich photos without downloading them once it lives on the server", async () => {
    const { session } = sessionWith();
    session.chooseHome("server");

    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-01T10:00:00Z")]);
    await session.intake.settled();

    expect(session.pictures.state.pictures).toEqual([
      expect.objectContaining({ id: "asset-1", immichAssetId: "asset-1" }),
    ]);
    expect(session.pictures.state.busy).toBe(false);
  });

  it("refuses device pictures for a server slideshow", () => {
    const { session } = sessionWith();
    session.chooseHome("server");

    expect(() => session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")])).toThrow(
      /server slideshow/,
    );
  });

  it("keeps where it lives once a picture is in", async () => {
    const { session } = await withTwoPictures();

    expect(() => session.chooseHome("server")).toThrow(/clear the pictures/);
    expect(choicesOf(session).home).toBe("device");
  });

  it("creates it on the server with every song's audio in order, storing nothing on the device", async () => {
    const { session, store, onServer } = sessionWith();
    session.chooseHome("server");
    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-01T10:00:00Z")]);
    const songs = [
      new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" }),
      new File(["other tune"], "Herbst.mp3", { type: "audio/mpeg" }),
    ];
    await session.addSongs(songs);

    const created = await session.create("de");

    expect(onServer.map(({ slideshow }) => slideshow.id)).toEqual([created.id]);
    expect(onServer[0]?.songsAudio).toEqual(songs);
    expect(created.songs.map((song) => song.fileName)).toEqual(["Sommer.mp3", "Herbst.mp3"]);
    expect(created.pictures.map(({ id }) => id)).toEqual(["asset-1"]);
    expect(await store.listSlideshows()).toEqual([]);
  });

  it("creates it on the server with no songs' audio when it has no music", async () => {
    const { session, onServer } = sessionWith();
    session.chooseHome("server");
    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-01T10:00:00Z")]);
    await session.intake.settled();

    const created = await session.create("de");

    expect(onServer.map(({ slideshow }) => slideshow.id)).toEqual([created.id]);
    expect(onServer[0]?.songsAudio).toEqual([]);
  });

  it("keeps its pictures when creating on the server fails, to try again", async () => {
    const failure = new Error("server away");
    const { session } = sessionWith(new MemoryLibraryStore(), {
      createOnServer: () => Promise.reject(failure),
    });
    session.chooseHome("server");
    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-01T10:00:00Z")]);
    await session.intake.settled();

    await expect(session.create("de")).rejects.toBe(failure);

    expect(session.pictures.state.pictures.map(({ id }) => id)).toEqual(["asset-1"]);
  });
});
