import { describe, expect, it } from "vitest";
import type { ImmichFace } from "../immich/immich-client";
import { PictureNotDownloadedError } from "../import/picture-source";
import { MediaNotFoundError, type StoredSlideshow } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { keepCopyOnDevice } from "./keep-copy";
import { decodeAsText, FakeImmichMedia } from "./testing/fake-immich-media";
import { linkedPicture, serverSlideshow } from "./testing/server-store-harness";

const COPIED_AT = new Date("2026-10-10T09:00:00Z");
const FACE: ImmichFace = { imageWidth: 100, imageHeight: 50, x1: 25, y1: 5, x2: 75, y2: 25 };

function setUp() {
  const store = new MemoryLibraryStore();
  const immich = new FakeImmichMedia();
  const serverMusic = new Map<string, Blob>();
  const progress: number[] = [];
  let ids = 0;
  const ports = {
    store,
    server: {
      musicBlob: (id: string) => {
        const music = serverMusic.get(id);
        return music === undefined
          ? Promise.reject(new MediaNotFoundError(id))
          : Promise.resolve(music);
      },
    },
    immich: {
      client: immich,
      decode: decodeAsText,
      reportUnavailable: () => undefined,
      log: () => undefined,
    },
    newId: () => `id-${String(++ids)}`,
    now: () => COPIED_AT,
    log: () => undefined,
  };
  const keep = (
    slideshow: StoredSlideshow,
    options: { existingTitles?: string[]; signal?: AbortSignal } = {},
  ) =>
    keepCopyOnDevice(slideshow, ports, {
      existingTitles: options.existingTitles ?? [],
      signal: options.signal ?? new AbortController().signal,
      onProgress: (fraction) => progress.push(fraction),
    });
  return { store, immich, serverMusic, progress, keep };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the promise to reject"),
    (error: unknown) => error,
  );
}

describe("keepCopyOnDevice", () => {
  it("downloads every picture into a new device slideshow with its own settings and a unique title", async () => {
    const { store, immich, keep } = setUp();
    immich.add("asset-1");
    const server = serverSlideshow({
      id: "server-show",
      title: "Lake",
      pictures: [{ ...linkedPicture("asset-1"), caption: "Morning", durationMs: 4000 }],
      ownOrder: true,
    });

    const copy = await keep(server, { existingTitles: ["Lake"] });

    expect(copy).toEqual({
      id: "id-3",
      title: "Lake (2)",
      createdAt: COPIED_AT.toISOString(),
      pictures: [
        {
          id: "id-2",
          capturedAt: "2025-07-01T10:00:00Z",
          width: 300,
          height: 200,
          fileName: "asset-1.jpg",
          caption: "Morning",
          durationMs: 4000,
          immichAssetId: "asset-1",
        },
      ],
      ownOrder: true,
      secondsPerPicture: 5,
    });
    expect(await store.listSlideshows()).toEqual([copy]);
    expect(await (await store.pictureBlob("id-2")).text()).toBe("display of original asset-1");
    expect(await (await store.thumbnailBlob("id-2")).text()).toBe("thumbnail of original asset-1");
  });

  it("keeps the focus Immich's faces give each picture", async () => {
    const { store, immich, keep } = setUp();
    immich.add("asset-1", { faces: [FACE] });

    const copy = await keep(serverSlideshow());

    const focus = await store.pictureFocus(copy.pictures.map((picture) => picture.id));
    expect([...focus.values()]).toEqual([
      { kind: "subject", box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 } },
    ]);
  });

  it("copies the server's music onto the device", async () => {
    const { store, immich, serverMusic, keep } = setUp();
    immich.add("asset-1");
    serverMusic.set("server-music", new Blob(["tune"]));
    const music = {
      id: "server-music",
      fileName: "track.m4a",
      durationMs: 60000,
      mimeType: "audio/mp4",
    };

    const copy = await keep(serverSlideshow({ music }));

    expect(copy.music).toEqual({ ...music, id: "id-3" });
    expect(await (await store.musicBlob("id-3")).text()).toBe("tune");
  });

  it("reports its progress from 0 to 1, a step per picture and the music", async () => {
    const { immich, serverMusic, progress, keep } = setUp();
    immich.add("asset-1").add("asset-2").add("asset-3");
    serverMusic.set("m", new Blob(["tune"]));
    const pictures = ["asset-1", "asset-2", "asset-3"].map(linkedPicture);

    await keep(
      serverSlideshow({
        pictures,
        music: { id: "m", fileName: "t.m4a", durationMs: 1000, mimeType: "audio/mp4" },
      }),
    );

    expect(progress).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("keeps nothing when a picture cannot be downloaded, e.g. one no longer in Immich", async () => {
    const { store, immich, keep } = setUp();
    immich.add("asset-1");
    const kept = serverSlideshow({ id: "kept", title: "Kept" });
    await store.saveSlideshow(kept);

    const error = await rejection(
      keep(serverSlideshow({ pictures: [linkedPicture("asset-1"), linkedPicture("asset-gone")] })),
    );

    expect(error).toBeInstanceOf(PictureNotDownloadedError);
    expect(await store.listSlideshows()).toEqual([kept]);
    expect(await rejection(store.pictureBlob("id-2"))).toBeInstanceOf(MediaNotFoundError);
  });

  it("keeps nothing when cancelled, rejecting with the signal's reason", async () => {
    const { store, immich, keep } = setUp();
    immich.add("asset-1");
    const cancel = new AbortController();
    const cancelled = new Error("cancelled");
    cancel.abort(cancelled);

    const error = await rejection(keep(serverSlideshow(), { signal: cancel.signal }));

    expect(error).toBe(cancelled);
    expect(await store.listSlideshows()).toEqual([]);
  });
});
