import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { immichPhoto, sessionWith } from "./testing/import-session-fixtures";
import { deferredColours } from "./testing/deferred-colours";

const PHOTO = immichPhoto("asset-1", "2025-07-01T10:00:00Z");

function serverSession() {
  const deferred = deferredColours();
  const setup = sessionWith(new MemoryLibraryStore(), { immichColours: deferred.colours });
  setup.session.chooseHome("server");
  return { ...setup, deferred };
}

describe("PictureIntake, linking Immich photos for a server slideshow", () => {
  it("is linking from the pick until the photos landed", async () => {
    const { session, deferred } = serverSession();
    const seen: boolean[] = [];
    session.intake.linking.subscribe((linking) => seen.push(linking));

    session.addImmichPhotos([PHOTO]);
    const read = await deferred.asked(PHOTO.id);
    expect(session.intake.linking.current()).toBe(true);
    read.resolve();
    await session.intake.linked();

    expect(session.intake.linking.current()).toBe(false);
    expect(session.pictures.state.pictures.map(({ id }) => id)).toEqual(["asset-1"]);
    expect(seen).toEqual([false, true, false]);
  });

  it("links a photo whose thumbnail cannot be read, logs the failure and does not report it", async () => {
    const { session, deferred, errors, logged } = serverSession();
    const failure = new Error("thumbnail unreadable");

    session.addImmichPhotos([PHOTO]);
    (await deferred.asked(PHOTO.id)).reject(failure);
    await session.intake.linked();
    await session.reported();

    expect(session.intake.linking.current()).toBe(false);
    expect(session.pictures.state.pictures.map(({ id }) => id)).toEqual(["asset-1"]);
    expect(logged).toEqual([failure]);
    expect(errors).toEqual([]);
  });

  it("takes a photo picked twice in overlapping links once", async () => {
    const { session, deferred } = serverSession();

    session.addImmichPhotos([PHOTO]);
    session.addImmichPhotos([PHOTO]);
    // Every read is answered, so a second link reading at the same time would land its photo too.
    deferred.answerAll();
    await session.intake.linked();

    expect(session.pictures.state.pictures.map(({ id }) => id)).toEqual(["asset-1"]);
    expect(session.pictures.state.skipped).toEqual([
      { fileName: "asset-1.jpg", reason: "chosenTwice" },
    ]);
  });

  it("drops a link's late result when the import is discarded", async () => {
    const { session, deferred } = serverSession();

    session.addImmichPhotos([PHOTO]);
    const read = await deferred.asked(PHOTO.id);
    const discarded = session.intake.discard();
    expect(session.intake.linking.current()).toBe(false);
    read.resolve();
    await session.intake.linked();
    await discarded;

    expect(session.pictures.state.pictures).toEqual([]);
    expect(session.intake.linking.current()).toBe(false);
  });

  it("links the next pick although the one before it had an unreadable thumbnail", async () => {
    const { session, deferred } = serverSession();
    const other = immichPhoto("asset-2", "2025-07-02T10:00:00Z");

    session.addImmichPhotos([PHOTO]);
    session.addImmichPhotos([other]);
    (await deferred.asked(PHOTO.id)).reject(new Error("unreadable"));
    (await deferred.asked(other.id)).resolve();
    await session.intake.linked();

    expect(session.pictures.state.pictures.map(({ id }) => id)).toEqual(["asset-1", "asset-2"]);
  });
});

describe("ImportSession, with a link pending", () => {
  it("waits for it to create the slideshow, which then holds the linked photo", async () => {
    const { session, deferred, onServer } = serverSession();
    session.addImmichPhotos([PHOTO]);
    const read = await deferred.asked(PHOTO.id);

    const creating = session.create("de");
    read.resolve();
    const created = await creating;

    expect(created.pictures.map(({ id }) => id)).toEqual(["asset-1"]);
    expect(onServer).toHaveLength(1);
  });

  it("keeps where the slideshow lives, which turns to the device only once nothing is in", async () => {
    const { session, deferred } = serverSession();
    session.addImmichPhotos([PHOTO]);
    const read = await deferred.asked(PHOTO.id);

    expect(() => session.chooseHome("device")).toThrow(/clear the pictures/);
    expect(session.choices.current().home).toBe("server");

    read.resolve();
    await session.intake.linked();
    expect(() => session.chooseHome("device")).toThrow(/clear the pictures/);
  });
});
