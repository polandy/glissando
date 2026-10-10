import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError } from "../library/stored-slideshow";
import { serverDocumentFor } from "./server-document";
import { ServerLibraryUnavailableError } from "./server-library-client";
import { SlideshowChangedError } from "./server-slideshow-store";
import { serverSlideshow, serverStoreHarness } from "./testing/server-store-harness";

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the promise to reject"),
    (error: unknown) => error,
  );
}

describe("ServerSlideshowStore editing", () => {
  it("lists the server's slideshows newest first, each picture's id its Immich asset", async () => {
    const { store, seed } = serverStoreHarness();
    const older = await seed(serverSlideshow({ title: "Older" }));
    const newer = await seed(
      serverSlideshow({ title: "Newer", createdAt: "2026-01-01T00:00:00Z" }),
    );

    expect(await store.listSlideshows()).toEqual([newer, older]);
  });

  it("reads one slideshow, and throws SlideshowNotFoundError for an unknown id", async () => {
    const { store, seed } = serverStoreHarness();
    const seeded = await seed();

    expect(await store.getSlideshow(seeded.id)).toEqual(seeded);
    expect(await rejection(store.getSlideshow("unknown"))).toBeInstanceOf(SlideshowNotFoundError);
  });

  it("updates a slideshow on the server in place", async () => {
    const { store, seed, titleOnServer } = serverStoreHarness();
    const seeded = await seed();

    await store.updateSlideshow({ ...seeded, title: "Summer at the lake" });

    expect(await titleOnServer(seeded.id)).toBe("Summer at the lake");
    expect(await store.getSlideshow(seeded.id)).toEqual({ ...seeded, title: "Summer at the lake" });
  });

  it("applies edits one after another, each naming the revision the one before left", async () => {
    const { store, seed, titleOnServer } = serverStoreHarness();
    const seeded = await seed();
    await store.getSlideshow(seeded.id);

    await Promise.all([
      store.updateSlideshow({ ...seeded, title: "First" }),
      store.updateSlideshowWith(seeded.id, (current) => ({
        ...current,
        title: `${current.title}, then second`,
      })),
    ]);

    expect(await titleOnServer(seeded.id)).toBe("First, then second");
  });

  it("edits the version last seen with a function and returns the result", async () => {
    const { store, seed, titleOnServer } = serverStoreHarness();
    const seeded = await seed(serverSlideshow({ title: "Summer" }));
    await store.getSlideshow(seeded.id);

    const edited = await store.updateSlideshowWith(seeded.id, (current) => ({
      ...current,
      title: `${current.title} at the lake`,
    }));

    expect(edited).toEqual({ ...seeded, title: "Summer at the lake" });
    expect(await titleOnServer(seeded.id)).toBe("Summer at the lake");
  });

  it("refuses an edit of a version changed on another device with SlideshowChangedError carrying the current one", async () => {
    const { store, seed, client, titleOnServer } = serverStoreHarness();
    const seeded = await seed();
    await store.getSlideshow(seeded.id);
    const elsewhere = { ...seeded, title: "Edited elsewhere" };
    await client.replaceSlideshow(seeded.id, 1, serverDocumentFor(elsewhere));

    const error = await rejection(store.updateSlideshow({ ...seeded, title: "Edited here" }));

    expect(error).toBeInstanceOf(SlideshowChangedError);
    expect((error as SlideshowChangedError).current).toEqual(elsewhere);
    expect(await titleOnServer(seeded.id)).toBe("Edited elsewhere");
  });

  it("edits on top of the current version once a conflict has shown it", async () => {
    const { store, seed, client, titleOnServer } = serverStoreHarness();
    const seeded = await seed();
    await store.getSlideshow(seeded.id);
    await client.replaceSlideshow(
      seeded.id,
      1,
      serverDocumentFor({ ...seeded, title: "Elsewhere" }),
    );
    await rejection(store.updateSlideshow({ ...seeded, title: "Lost" }));

    await store.updateSlideshowWith(seeded.id, (current) => ({
      ...current,
      title: `${current.title}, then here`,
    }));

    expect(await titleOnServer(seeded.id)).toBe("Elsewhere, then here");
  });

  it("rejects with the edit's own error and leaves the slideshow as it was", async () => {
    const { store, seed, titleOnServer } = serverStoreHarness();
    const seeded = await seed(serverSlideshow({ title: "July 2025" }));
    const editFailed = new RangeError("the edit cannot be applied");

    const error = await rejection(
      store.updateSlideshowWith(seeded.id, () => {
        throw editFailed;
      }),
    );

    expect(error).toBe(editFailed);
    expect(await titleOnServer(seeded.id)).toBe("July 2025");
  });

  it("throws SlideshowNotFoundError when editing a deleted slideshow, and does not bring it back", async () => {
    const { store, seed } = serverStoreHarness();
    const kept = await seed(serverSlideshow({ title: "Kept" }));
    const deleted = await seed();
    await store.getSlideshow(deleted.id);
    await store.deleteSlideshow(deleted.id);

    const updating = await rejection(store.updateSlideshow({ ...deleted, title: "Edited" }));
    const editing = await rejection(
      store.updateSlideshowWith(deleted.id, (current) => ({ ...current, title: "Edited" })),
    );

    expect(updating).toBeInstanceOf(SlideshowNotFoundError);
    expect(editing).toBeInstanceOf(SlideshowNotFoundError);
    expect(await store.listSlideshows()).toEqual([kept]);
  });

  it("deletes a slideshow for every device, and throws SlideshowNotFoundError for an unknown id", async () => {
    const { store, seed, client } = serverStoreHarness();
    const seeded = await seed();

    await store.deleteSlideshow(seeded.id);

    expect(await client.listSlideshows()).toEqual([]);
    expect(await rejection(store.deleteSlideshow(seeded.id))).toBeInstanceOf(
      SlideshowNotFoundError,
    );
  });

  it("does not apply an edit the server did not answer, and keeps the last saved version", async () => {
    const { store, seed, control, titleOnServer } = serverStoreHarness();
    const seeded = await seed();
    await store.getSlideshow(seeded.id);
    control.down = true;

    const error = await rejection(store.updateSlideshow({ ...seeded, title: "Unsaved" }));
    control.down = false;
    await store.updateSlideshowWith(seeded.id, (current) => ({
      ...current,
      title: `${current.title}, saved`,
    }));

    expect(error).toBeInstanceOf(ServerLibraryUnavailableError);
    expect(await titleOnServer(seeded.id)).toBe("July 2025, saved");
  });
});
