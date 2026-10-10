import { describe, expect, it } from "vitest";
import { UnreadableMusicError, type MusicProbe } from "../../import/music-probe";
import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import type { ImportChoices } from "./import-session";
import {
  CREATED_AT,
  MUSIC_MS,
  choicesOf,
  pictureFile,
  sessionWith,
  withTwoPictures,
} from "./testing/import-session-fixtures";

describe("ImportSession, its choices of music and seconds per picture", () => {
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

  it("starts without music at the default seconds per picture", () => {
    const { session } = sessionWith();
    expect(choicesOf(session)).toEqual({
      home: "device",
      music: null,
      secondsPerPicture: DEFAULT_SECONDS_PER_PICTURE,
    });
  });

  it("creates a slideshow of the imported pictures in capture order, titled by their range", async () => {
    const { session, store } = await withTwoPictures();
    session.setSecondsPerPicture(4.5);

    const created = await session.create("de");

    expect(created.pictures.map((picture) => picture.fileName)).toEqual(["early.jpg", "late.jpg"]);
    expect(created.title).toBe("Juli–August 2025");
    expect(created.secondsPerPicture).toBe(4.5);
    expect(created.createdAt).toBe(CREATED_AT.toISOString());
    expect(created.music).toBeUndefined();
    expect(await store.getSlideshow(created.id)).toEqual(created);
  });

  it("stores the chosen music with the slideshow", async () => {
    const { session, store } = await withTwoPictures();
    const file = new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" });
    await session.chooseMusic(file);

    const created = await session.create("de");

    expect(created.music).toEqual({
      id: expect.any(String) as string,
      fileName: "Sommer.mp3",
      durationMs: MUSIC_MS,
      mimeType: "audio/mpeg",
    });
    const musicId = created.music?.id ?? "";
    expect(await (await store.musicBlob(musicId)).text()).toBe("tune");
  });

  it("keeps the previous choice when music cannot be read", async () => {
    const { session } = await withTwoPictures();
    await session.chooseMusic(new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" }));

    await expect(
      session.chooseMusic(new File(["x"], "noise.broken", { type: "audio/mpeg" })),
    ).rejects.toBeInstanceOf(UnreadableMusicError);

    expect(choicesOf(session).music?.file.name).toBe("Sommer.mp3");
  });

  it("forgets removed music", async () => {
    const { session } = await withTwoPictures();
    await session.chooseMusic(new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" }));
    session.removeMusic();

    expect(choicesOf(session).music).toBeNull();
    expect((await session.create("de")).music).toBeUndefined();
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

  it("keeps the last music picked when an earlier pick is probed later", async () => {
    const probes = new Map<string, (probe: MusicProbe) => void>();
    const { session } = sessionWith(new MemoryLibraryStore(), {
      probeMusic: (file) => new Promise((resolve) => probes.set(file.name, resolve)),
    });
    const first = session.chooseMusic(new File(["a"], "first.mp3", { type: "audio/mpeg" }));
    const second = session.chooseMusic(new File(["b"], "second.mp3", { type: "audio/mpeg" }));

    probes.get("second.mp3")?.({ durationMs: MUSIC_MS });
    await second;
    probes.get("first.mp3")?.({ durationMs: MUSIC_MS });
    await first;

    expect(choicesOf(session).music?.file.name).toBe("second.mp3");
  });

  it("discarding clears the pictures and the choices", async () => {
    const { session } = await withTwoPictures();
    await session.chooseMusic(new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" }));

    session.discard();

    expect(session.pictures.state.pictures).toEqual([]);
    expect(choicesOf(session).music).toBeNull();
  });
});
