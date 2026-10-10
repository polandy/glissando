import { describe, expect, it } from "vitest";
import type { ImmichPhoto } from "../../immich/immich-client";
import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { fakeIntakePorts, INTAKE_NOW, pictureFile } from "../testing/picture-intake-ports";
import { AddPicturesSession, serverAddingStore } from "./add-pictures-session";

const SHOW: StoredSlideshow = slideshow({
  pictures: [
    { ...picture("old-1"), capturedAt: "2025-07-01T10:00:00Z" },
    { ...picture("old-2"), capturedAt: "2025-07-03T10:00:00Z" },
  ],
});

/** Logs the slideshow reads, the slideshow edits and the claims ended, in their order. */
class LoggingStore extends MemoryLibraryStore {
  readonly log: string[] = [];
  override getSlideshow(id: string): Promise<StoredSlideshow> {
    this.log.push("read");
    return super.getSlideshow(id);
  }
  override updateSlideshow(updated: StoredSlideshow): Promise<void> {
    this.log.push("replace");
    return super.updateSlideshow(updated);
  }
  override updateSlideshowWith(
    id: string,
    edit: (current: StoredSlideshow) => StoredSlideshow,
  ): Promise<StoredSlideshow> {
    this.log.push("update");
    return super.updateSlideshowWith(id, edit);
  }
  override releaseClaim(claimId: string): Promise<void> {
    this.log.push(`end ${claimId}`);
    return super.releaseClaim(claimId);
  }
}

/** Fails to end any claim. */
class UnreleasingStore extends LoggingStore {
  static readonly failure = new Error("the claim could not be released");
  override releaseClaim(): Promise<void> {
    return Promise.reject(UnreleasingStore.failure);
  }
}

async function sessionFor(
  stored: StoredSlideshow = SHOW,
  store = new LoggingStore(),
  home: "device" | "server" = "device",
) {
  await store.saveSlideshow(stored);
  const { ports, errors } = fakeIntakePorts(store);
  return { session: new AddPicturesSession(stored, home, { ...ports, store }), store, errors };
}

const immichPhoto = (id: string, takenAt: string): ImmichPhoto => ({
  id,
  fileName: `${id}.jpg`,
  takenAt,
  size: { width: 4000, height: 3000 },
});

describe("AddPicturesSession, to a slideshow on the Glissando server", () => {
  it("links Immich photos without downloading them", async () => {
    const { session } = await sessionFor(SHOW, new LoggingStore(), "server");

    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-02T10:00:00Z")]);

    expect(session.intake.pictures.state.pictures).toEqual([
      expect.objectContaining({ id: "asset-1", immichAssetId: "asset-1" }),
    ]);
    expect(session.intake.pictures.state.busy).toBe(false);
  });

  it("refuses device pictures", async () => {
    const { session } = await sessionFor(SHOW, new LoggingStore(), "server");

    expect(() => session.addPictures([pictureFile("a.jpg", "2025-07-02T10:00:00Z")])).toThrow(
      /server slideshow/,
    );
  });

  it("stores the linked photos into the slideshow by capture date", async () => {
    const { session, store } = await sessionFor(SHOW, new LoggingStore(), "server");
    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-02T10:00:00Z")]);

    await session.commit();

    expect((await store.getSlideshow(SHOW.id)).pictures.map(({ id }) => id)).toEqual([
      "old-1",
      "asset-1",
      "old-2",
    ]);
  });
});

describe("the store adding to a server slideshow", () => {
  it("edits the slideshow on the server", async () => {
    const server = new MemoryLibraryStore();
    await server.saveSlideshow(SHOW);

    await serverAddingStore(server).updateSlideshowWith(SHOW.id, (current) => ({
      ...current,
      title: "Renamed",
    }));

    expect((await server.getSlideshow(SHOW.id)).title).toBe("Renamed");
  });

  it("writes no picture, as a server slideshow links its photos", async () => {
    const adding = serverAddingStore(new MemoryLibraryStore());

    await expect(adding.claimMedia("claim", INTAKE_NOW, "media")).resolves.toBeUndefined();
    await expect(
      adding.putPicture("media", { display: new Blob(), thumbnail: new Blob() }),
    ).rejects.toThrow(/links/);
  });
});

describe("AddPicturesSession, to a slideshow on this device", () => {
  it("downloads Immich photos into the device", async () => {
    const { session } = await sessionFor();

    session.addImmichPhotos([immichPhoto("asset-1", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();

    expect(session.intake.pictures.state.pictures).toHaveLength(1);
    expect(session.intake.pictures.state.pictures[0]?.id).not.toBe("asset-1");
  });
});

describe("AddPicturesSession", () => {
  it("stores the new pictures into the slideshow by capture date and returns their ids", async () => {
    const { session, store } = await sessionFor();
    session.intake.addPictures([pictureFile("middle.jpg", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();

    const added = await session.commit();

    const stored = await store.getSlideshow(SHOW.id);
    expect(stored.pictures.map(({ fileName }) => fileName)).toEqual([
      "old-1.jpg",
      "middle.jpg",
      "old-2.jpg",
    ]);
    expect(added).toEqual([stored.pictures[1]?.id]);
  });

  it("ends the claim once stored, the slideshow keeping the new media from a clean-up", async () => {
    const { session, store } = await sessionFor();
    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();

    const [added] = await session.commit();
    await store.deleteUnreferencedMedia(INTAKE_NOW);

    expect(await (await store.pictureBlob(added ?? "")).text()).toMatch(/display/);
    expect(store.log).toEqual(["update", "end id-1"]);
  });

  it("stores the pictures in one read-and-write edit of the record, never a separate read", async () => {
    const { session, store } = await sessionFor();
    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();

    await session.commit();

    expect(store.log).toEqual(["update", "end id-1"]);
  });

  it("still resolves with the ids once stored when ending the claim fails, and reports it", async () => {
    const { session, store, errors } = await sessionFor(SHOW, new UnreleasingStore());
    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();

    const added = await session.commit();

    const stored = await store.getSlideshow(SHOW.id);
    expect(added).toEqual([stored.pictures[1]?.id]);
    expect(errors).toEqual([UnreleasingStore.failure]);
  });

  it("skips a picture already in the slideshow as a duplicate", async () => {
    const { session } = await sessionFor();

    session.intake.addPictures([pictureFile("old-1.jpg", "2025-07-01T10:00:00Z")]);
    await session.intake.pictures.settled();

    expect(session.intake.pictures.state.skipped).toEqual([
      { fileName: "old-1.jpg", reason: "alreadyIn" },
    ]);
  });

  it("refreshed after an edit, shows the record as stored now and skips its pictures as already in", async () => {
    const { session } = await sessionFor();
    const added = { ...picture("old-3"), capturedAt: "2025-07-05T10:00:00Z" };

    session.refresh({
      ...SHOW,
      title: "Renamed",
      ownOrder: true,
      pictures: [...SHOW.pictures, added],
    });
    session.intake.addPictures([pictureFile("old-3.jpg", added.capturedAt)]);
    await session.intake.pictures.settled();

    expect(session.slideshow).toMatchObject({ title: "Renamed", ownOrder: true });
    expect(session.intake.known).toHaveLength(3);
    expect(session.intake.pictures.state.skipped).toEqual([
      { fileName: "old-3.jpg", reason: "alreadyIn" },
    ]);
  });

  it("keeps the edits stored since it opened, such as a new title", async () => {
    const { session, store } = await sessionFor();
    await store.updateSlideshow({ ...SHOW, title: "Renamed" });
    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();

    await session.commit();

    expect((await store.getSlideshow(SHOW.id)).title).toBe("Renamed");
  });

  it("fails with SlideshowNotFoundError when the slideshow was deleted meanwhile", async () => {
    const { session, store } = await sessionFor();
    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    await session.intake.pictures.settled();
    await store.deleteSlideshow(SHOW.id);

    await expect(session.commit()).rejects.toBeInstanceOf(SlideshowNotFoundError);
  });

  it("refuses to add while pictures are still being downscaled, or none", async () => {
    const { session } = await sessionFor();
    await expect(session.commit()).rejects.toThrow(/no pictures/);

    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    await expect(session.commit()).rejects.toThrow(/still being/);
  });
});
