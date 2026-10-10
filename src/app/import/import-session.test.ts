import { describe, expect, it } from "vitest";
import { UnreadableMusicError, type MusicProbe } from "../../import/music-probe";
import {
  DEFAULT_SECONDS_PER_PICTURE,
  MediaNotFoundError,
  type PictureBlobs,
  type StoredSlideshow,
} from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { PictureImportFailedError } from "../../import/picture-import";
import type { ImmichPhoto } from "../../immich/immich-client";
import type { PictureFocus } from "../../library/picture-focus";
import { ImportSession, type ImportChoices, type ImportSessionPorts } from "./import-session";

const CREATED_AT = new Date("2026-10-08T12:00:00Z");
const MUSIC_MS = 60_000;
const FACE: PictureFocus = { kind: "subject", box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 } };

const pictureFile = (name: string, capturedAt: string): File =>
  Object.assign(new File([name], name, { type: "image/jpeg" }), { capturedAt });

function sessionWith(
  store = new MemoryLibraryStore(),
  overrides: Partial<ImportSessionPorts> = {},
) {
  let nextId = 0;
  const errors: unknown[] = [];
  const logged: unknown[] = [];
  const ports: ImportSessionPorts = {
    store,
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([`display ${file.name}`]),
        thumbnail: new Blob([`thumbnail ${file.name}`]),
      }),
    captureDate: (file) => Promise.resolve((file as File & { capturedAt: string }).capturedAt),
    immichSource: (photo: ImmichPhoto) => ({
      fileName: photo.fileName,
      mimeType: "image/jpeg",
      identify: () =>
        Promise.resolve({
          fileName: photo.fileName,
          capturedAt: photo.takenAt,
          immichAssetId: photo.id,
        }),
      read: () =>
        Promise.resolve({
          decoded: {
            width: 400,
            height: 300,
            display: new Blob([`display ${photo.id}`]),
            thumbnail: new Blob([`thumbnail ${photo.id}`]),
          },
          focus: FACE,
        }),
    }),
    probeMusic: (file): Promise<MusicProbe> =>
      file.name.endsWith(".broken")
        ? Promise.reject(new UnreadableMusicError(file.name))
        : Promise.resolve({ durationMs: MUSIC_MS }),
    newId: () => `id-${(nextId += 1)}`,
    now: () => CREATED_AT,
    onError: (error) => errors.push(error),
    log: (error) => logged.push(error),
    ...overrides,
  };
  return { session: new ImportSession(ports), store, errors, logged };
}

async function withTwoPictures() {
  const setup = sessionWith();
  setup.session.addPictures([
    pictureFile("late.jpg", "2025-08-02T10:00:00Z"),
    pictureFile("early.jpg", "2025-07-01T10:00:00Z"),
  ]);
  await setup.session.pictures.settled();
  return setup;
}

function choicesOf(session: ImportSession): ImportChoices {
  return session.choices.current();
}

/** Logs the calls that order media writes against the claims of the import in progress. */
class LoggingStore extends MemoryLibraryStore {
  readonly log: string[] = [];
  override claimMedia(importId: string, startedAt: Date, mediaId: string): Promise<void> {
    this.log.push(`claim ${mediaId}`);
    return super.claimMedia(importId, startedAt, mediaId);
  }
  override putPicture(id: string, blobs: PictureBlobs): Promise<void> {
    this.log.push(`picture ${id}`);
    return super.putPicture(id, blobs);
  }
  override putMusic(id: string, blob: Blob): Promise<void> {
    this.log.push(`music ${id}`);
    return super.putMusic(id, blob);
  }
  override saveSlideshow(slideshow: StoredSlideshow): Promise<void> {
    this.log.push("slideshow");
    return super.saveSlideshow(slideshow);
  }
  override releaseClaim(importId: string): Promise<void> {
    this.log.push(`end ${importId}`);
    return super.releaseClaim(importId);
  }
}

describe("ImportSession", () => {
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
