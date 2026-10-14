import { describe, expect, it } from "vitest";
import type { StoredMusic, StoredPicture } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { createServerSlideshow, partitionForServer, saveOnServer } from "./save-on-server";
import { libraryServiceFetch } from "./testing/library-service-fetch";
import { linkedPicture, serverSlideshow } from "./testing/server-store-harness";

const MUSIC: StoredMusic = {
  id: "device-music",
  fileName: "track.m4a",
  durationMs: 60000,
  mimeType: "audio/mp4",
  fadeInMs: 0,
};

function devicePicture(id: string, immichAssetId?: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 3240,
    height: 2160,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...(immichAssetId === undefined ? {} : { immichAssetId }),
  };
}

describe("createServerSlideshow", () => {
  it("creates the slideshow on the server and answers it as the server keeps it", async () => {
    const { client } = libraryServiceFetch();

    const created = await createServerSlideshow(serverSlideshow({ title: "Lake" }), [], client);

    expect(await client.listSlideshows()).toHaveLength(1);
    expect(created).toEqual({ ...serverSlideshow({ title: "Lake" }), id: created.id });
    expect((await client.getSlideshow(created.id)).document.slideshow.title).toBe("Lake");
  });

  it("uploads every song first, in play order, and names each by the server's id", async () => {
    const { client } = libraryServiceFetch();

    const created = await createServerSlideshow(
      serverSlideshow({ songs: [MUSIC] }),
      [new Blob(["tune"])],
      client,
    );

    const [song] = created.songs;
    expect(song).toEqual({ ...MUSIC, id: song?.id });
    expect(song?.id).not.toBe(MUSIC.id);
    const music = await client.music(song?.id ?? "");
    expect(await music.text()).toBe("tune");
    expect(music.type).toBe("audio/mp4");
  });

  it("refuses a playlist without every song's audio, before anything reaches the server", async () => {
    const { client } = libraryServiceFetch();

    await expect(
      createServerSlideshow(serverSlideshow({ songs: [MUSIC] }), [], client),
    ).rejects.toThrow(/audio/);
    expect(await client.listSlideshows()).toEqual([]);
  });
});

describe("partitionForServer", () => {
  it("parts the pictures into those linked from Immich and those only on this device", () => {
    const fromImmich = devicePicture("p1", "asset-1");
    const deviceOnly = devicePicture("p2");

    expect(partitionForServer(serverSlideshow({ pictures: [fromImmich, deviceOnly] }))).toEqual({
      linked: [fromImmich],
      deviceOnly: [deviceOnly],
    });
  });
});

describe("saveOnServer", () => {
  it("saves a copy with the Immich pictures only, leaving the device's slideshow as it is", async () => {
    const { client } = libraryServiceFetch();
    const device = serverSlideshow({
      id: "device-show",
      pictures: [devicePicture("p1", "asset-1"), devicePicture("p2")],
    });

    const saved = await saveOnServer(device, { client, store: new MemoryLibraryStore() });

    expect(saved.id).not.toBe("device-show");
    expect(saved.pictures).toEqual([{ ...devicePicture("p1", "asset-1"), id: "asset-1" }]);
    expect((await client.getSlideshow(saved.id)).document.slideshow.pictures).toHaveLength(1);
  });

  it("uploads the playlist's songs from the device's store", async () => {
    const { client } = libraryServiceFetch();
    const store = new MemoryLibraryStore();
    await store.putMusic(MUSIC.id, new Blob(["device tune"], { type: "audio/mp4" }));

    const saved = await saveOnServer(
      serverSlideshow({ pictures: [linkedPicture("asset-1")], songs: [MUSIC] }),
      {
        client,
        store,
      },
    );

    const [song] = saved.songs;
    expect(await (await client.music(song?.id ?? "")).text()).toBe("device tune");
  });

  it("refuses a slideshow without a picture from Immich, as a slideshow is never empty", async () => {
    const { client } = libraryServiceFetch();

    await expect(
      saveOnServer(serverSlideshow({ pictures: [devicePicture("p1")] }), {
        client,
        store: new MemoryLibraryStore(),
      }),
    ).rejects.toThrow(/Immich/);
    expect(await client.listSlideshows()).toEqual([]);
  });
});
