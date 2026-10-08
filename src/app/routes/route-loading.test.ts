import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { musicBlob, pictureBlobs } from "../../library/testing/library-store-contract";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { ObjectUrls } from "../media/object-urls";
import { loadPlayerMusic, loadSlideshowScreen, loadStartSlideshows } from "./route-loading";

const STORED: StoredSlideshow = {
  id: "show-1",
  title: "July 2025",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [
    { id: "picture-1", capturedAt: "2025-07-01T10:00:00Z", width: 3, height: 2, fileName: "a" },
  ],
  secondsPerPicture: 5,
};

/** Slideshow reads wait until the test opens the gate, so a route can unmount in between. */
class GatedStore extends MemoryLibraryStore {
  #open: () => void = () => undefined;
  readonly #gate = new Promise<void>((resolve) => (this.#open = resolve));

  openGate(): void {
    this.#open();
  }

  override async listSlideshows(): Promise<readonly StoredSlideshow[]> {
    await this.#gate;
    return super.listSlideshows();
  }

  override async getSlideshow(id: string): Promise<StoredSlideshow> {
    await this.#gate;
    return super.getSlideshow(id);
  }
}

async function storeWithOneSlideshow(): Promise<GatedStore> {
  const store = new GatedStore();
  await store.putPicture("picture-1", pictureBlobs("picture-1"));
  await store.saveSlideshow(STORED);
  return store;
}

function thumbnailUrls(
  store: GatedStore,
  errors: unknown[],
  load: (id: string) => Promise<Blob> = (id) => store.thumbnailBlob(id),
): ObjectUrls {
  let created = 0;
  return new ObjectUrls({
    load,
    create: () => `url:${String((created += 1))}`,
    revoke: () => undefined,
    onError: (error) => errors.push(error),
  });
}

describe("loadStartSlideshows", () => {
  it("lists the slideshows with their cover URLs", async () => {
    const store = await storeWithOneSlideshow();
    const errors: unknown[] = [];
    const loading = loadStartSlideshows(store, thumbnailUrls(store, errors), signal());
    store.openGate();

    expect((await loading)?.map(({ id, coverUrls }) => ({ id, coverUrls }))).toEqual([
      { id: "show-1", coverUrls: ["url:1"] },
    ]);
    expect(errors).toEqual([]);
  });

  it("resolves to null without touching the disposed covers when the screen left before the list arrived", async () => {
    const store = await storeWithOneSlideshow();
    const covers = thumbnailUrls(store, []);
    const leaving = new AbortController();
    const loading = loadStartSlideshows(store, covers, leaving.signal);

    leaving.abort();
    covers.dispose();
    store.openGate();

    await expect(loading).resolves.toBeNull();
  });
});

describe("loadSlideshowScreen", () => {
  it("shows the slideshow with its thumbnail URLs", async () => {
    const store = await storeWithOneSlideshow();
    const loading = loadSlideshowScreen(store, "show-1", thumbnailUrls(store, []), signal());
    store.openGate();

    const loaded = await loading;
    expect(loaded?.stored.id).toBe("show-1");
    expect(loaded?.details.pictures.map(({ thumbnailUrl }) => thumbnailUrl)).toEqual(["url:1"]);
  });

  it("resolves to null without touching the disposed thumbnails when the screen left before the slideshow arrived", async () => {
    const store = await storeWithOneSlideshow();
    const thumbnails = thumbnailUrls(store, []);
    const leaving = new AbortController();
    const loading = loadSlideshowScreen(store, "show-1", thumbnails, leaving.signal);

    leaving.abort();
    thumbnails.dispose();
    store.openGate();

    await expect(loading).resolves.toBeNull();
  });

  it("resolves to null rather than reporting a missing slideshow once the screen left", async () => {
    const store = await storeWithOneSlideshow();
    const thumbnails = thumbnailUrls(store, []);
    const leaving = new AbortController();
    const loading = loadSlideshowScreen(store, "deleted-show", thumbnails, leaving.signal);

    leaving.abort();
    store.openGate();

    await expect(loading).resolves.toBeNull();
  });

  it("resolves to null when the screen left while the thumbnails loaded", async () => {
    const store = await storeWithOneSlideshow();
    let thumbnailRequested: () => void = () => undefined;
    const requested = new Promise<void>((resolve) => (thumbnailRequested = resolve));
    let releaseThumbnail: (blob: Blob) => void = () => undefined;
    const thumbnails = thumbnailUrls(store, [], () => {
      thumbnailRequested();
      return new Promise((resolve) => (releaseThumbnail = resolve));
    });
    const leaving = new AbortController();
    store.openGate();
    const loading = loadSlideshowScreen(store, "show-1", thumbnails, leaving.signal);
    await requested;

    leaving.abort();
    thumbnails.dispose();
    releaseThumbnail(new Blob(["thumbnail"]));

    await expect(loading).resolves.toBeNull();
  });
});

describe("loadPlayerMusic", () => {
  const WITH_MUSIC: StoredSlideshow = {
    ...STORED,
    music: { id: "music-1", fileName: "song.mp3", durationMs: 1000, mimeType: "audio/mpeg" },
  };
  const urlOf = (blob: Blob) => `url:${String(blob.size)}`;

  it("opens an object URL for the slideshow's music", async () => {
    const store = new MemoryLibraryStore();
    await store.putMusic("music-1", musicBlob("music-1"));

    await expect(loadPlayerMusic(store, WITH_MUSIC, urlOf, signal())).resolves.toEqual({
      url: urlOf(musicBlob("music-1")),
    });
  });

  it("has no URL for a slideshow without music", async () => {
    await expect(
      loadPlayerMusic(new MemoryLibraryStore(), STORED, urlOf, signal()),
    ).resolves.toEqual({ url: null });
  });

  it("resolves to null and opens no URL when the player closed before the music arrived", async () => {
    const store = new MemoryLibraryStore();
    await store.putMusic("music-1", musicBlob("music-1"));
    const opened: Blob[] = [];
    const closing = new AbortController();
    const loading = loadPlayerMusic(
      store,
      WITH_MUSIC,
      (blob) => {
        opened.push(blob);
        return "url";
      },
      closing.signal,
    );

    closing.abort();

    await expect(loading).resolves.toBeNull();
    expect(opened).toEqual([]);
  });
});

function signal(): AbortSignal {
  return new AbortController().signal;
}
