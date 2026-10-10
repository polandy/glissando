import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { fakeIntakePorts, INTAKE_NOW, pictureFile } from "../testing/picture-intake-ports";
import { AddPicturesSession } from "./add-pictures-session";

const SHOW: StoredSlideshow = slideshow({
  pictures: [
    { ...picture("old-1"), capturedAt: "2025-07-01T10:00:00Z" },
    { ...picture("old-2"), capturedAt: "2025-07-03T10:00:00Z" },
  ],
});

/** Logs the slideshow updates and the claims ended, in their order. */
class LoggingStore extends MemoryLibraryStore {
  readonly log: string[] = [];
  override updateSlideshow(updated: StoredSlideshow): Promise<void> {
    this.log.push("update");
    return super.updateSlideshow(updated);
  }
  override releaseClaim(claimId: string): Promise<void> {
    this.log.push(`end ${claimId}`);
    return super.releaseClaim(claimId);
  }
}

async function sessionFor(stored: StoredSlideshow = SHOW) {
  const store = new LoggingStore();
  await store.saveSlideshow(stored);
  const { ports } = fakeIntakePorts(store);
  return { session: new AddPicturesSession(stored, { ...ports, store }), store };
}

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

  it("skips a picture already in the slideshow as a duplicate", async () => {
    const { session } = await sessionFor();

    session.intake.addPictures([pictureFile("old-1.jpg", "2025-07-01T10:00:00Z")]);
    await session.intake.pictures.settled();

    expect(session.intake.pictures.state.skipped).toEqual([
      { fileName: "old-1.jpg", reason: "duplicate" },
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
