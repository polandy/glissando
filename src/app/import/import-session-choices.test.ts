import { describe, expect, it } from "vitest";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
import { chosenSongs, type ImportChoices } from "./import-session";
import {
  CREATED_AT,
  MUSIC_MS,
  choicesOf,
  pictureFile,
  sessionWith,
  withTwoPictures,
} from "./testing/import-session-fixtures";

describe("ImportSession, its choices of songs and seconds per picture", () => {
  it("publishes its choices to a subscriber at once and on every change", () => {
    const { session } = sessionWith();
    const seen: ImportChoices[] = [];
    session.choices.subscribe((choices) => seen.push(choices));
    session.setSecondsPerPicture(4.5);
    expect(seen.map((choices) => choices.secondsPerPicture)).toEqual([
      DEFAULT_SECONDS_PER_PICTURE,
      4.5,
    ]);
  });

  it("starts without songs at the default seconds per picture", () => {
    const { session } = sessionWith();
    expect(choicesOf(session)).toEqual({
      home: "device",
      songs: [],
      secondsPerPicture: DEFAULT_SECONDS_PER_PICTURE,
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    });
  });

  it("creates a slideshow whose pictures last their own seconds with music too", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" })]);

    expect((await session.create("de")).pictureLength).toBe(OWN_SECONDS_PICTURE_LENGTH);
  });

  it("creates a slideshow whose pictures fill the music when chosen", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" })]);
    session.setPictureLength(undefined);

    expect(choicesOf(session).pictureLength).toBeUndefined();
    const created = await session.create("de");
    expect(created.songs[0]).toBeDefined();
    expect(created).not.toHaveProperty("pictureLength");
  });

  it("creates a slideshow of the imported pictures in capture order, titled by their range", async () => {
    const { session, store } = await withTwoPictures();
    session.setSecondsPerPicture(4.5);

    const created = await session.create("de");

    expect(created.pictures.map((picture) => picture.fileName)).toEqual(["early.jpg", "late.jpg"]);
    expect(created.title).toBe("Juli–August 2025");
    expect(created.secondsPerPicture).toBe(4.5);
    expect(created.createdAt).toBe(CREATED_AT.toISOString());
    expect(created.songs[0]).toBeUndefined();
    expect(await store.getSlideshow(created.id)).toEqual(created);
  });

  it("stores every chosen song with the slideshow, in the list's order", async () => {
    const { session, store } = await withTwoPictures();
    await session.addSongs([
      new File(["first tune"], "Sommer.mp3", { type: "audio/mpeg" }),
      new File(["second tune"], "Herbst.ogg", { type: "audio/ogg" }),
    ]);

    const created = await session.create("de");

    expect(created.songs).toEqual([
      {
        id: expect.any(String) as string,
        fileName: "Sommer.mp3",
        durationMs: MUSIC_MS,
        mimeType: "audio/mpeg",
      },
      {
        id: expect.any(String) as string,
        fileName: "Herbst.ogg",
        durationMs: MUSIC_MS,
        mimeType: "audio/ogg",
      },
    ]);
    const stored = await Promise.all(
      created.songs.map(async (song) => (await store.musicBlob(song.id)).text()),
    );
    expect(stored).toEqual(["first tune", "second tune"]);
  });

  it("adds songs picked later after the songs already in the list", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([new File(["a"], "first.mp3", { type: "audio/mpeg" })]);

    await session.addSongs([
      new File(["b"], "second.mp3", { type: "audio/mpeg" }),
      new File(["c"], "third.mp3", { type: "audio/mpeg" }),
    ]);

    expect(
      choicesOf(session)
        .songs.filter(
          (song) => song.kind !== "downloadingSample" && song.kind !== "failedSampleDownload",
        )
        .map(({ key, pickedName }) => ({ key, pickedName })),
    ).toEqual([
      { key: 1, pickedName: "first.mp3" },
      { key: 2, pickedName: "second.mp3" },
      { key: 3, pickedName: "third.mp3" },
    ]);
  });

  it("moves a song to another place in the list, and creates the slideshow in that order", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs(
      ["a.mp3", "b.mp3", "c.mp3"].map((name) => new File([name], name, { type: "audio/mpeg" })),
    );

    session.moveSong(3, 0);

    expect(chosenSongs(choicesOf(session)).map((song) => song.pickedName)).toEqual([
      "c.mp3",
      "a.mp3",
      "b.mp3",
    ]);
    const created = await session.create("de");
    expect(created.songs.map((song) => song.fileName)).toEqual(["c.mp3", "a.mp3", "b.mp3"]);
  });

  it("moves a song to a place among the chosen songs, past an unusable one between them", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([
      new File(["a"], "a.mp3", { type: "audio/mpeg" }),
      new File(["x"], "x.broken"),
      new File(["b"], "b.mp3", { type: "audio/mpeg" }),
    ]);

    session.moveSong(1, 1);

    expect(chosenSongs(choicesOf(session)).map((song) => song.pickedName)).toEqual([
      "b.mp3",
      "a.mp3",
    ]);
  });

  it("forgets a removed song and keeps the others", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs(
      ["a.mp3", "b.mp3"].map((name) => new File([name], name, { type: "audio/mpeg" })),
    );

    session.removeSong(1);

    expect(chosenSongs(choicesOf(session)).map((song) => song.pickedName)).toEqual(["b.mp3"]);
    expect((await session.create("de")).songs.map((song) => song.fileName)).toEqual(["b.mp3"]);
  });

  it("refuses to create while pictures are still being downscaled", async () => {
    const { session } = sessionWith();
    session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);

    await expect(session.create("de")).rejects.toThrow(/still being imported/);
  });

  it("refuses to create without pictures", async () => {
    const { session } = sessionWith();
    await expect(session.create("de")).rejects.toThrow(/no pictures/);
  });

  it("discarding clears the pictures and the choices", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" })]);

    session.discard();

    expect(session.pictures.state.pictures).toEqual([]);
    expect(choicesOf(session).songs).toEqual([]);
  });
});
