import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { loadPlayerMedia, openPlayerMedia } from "./player-media";

const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    { id: "p1", capturedAt: "2025-07-01T10:00:00Z", width: 300, height: 200, fileName: "a.jpg" },
    { id: "p2", capturedAt: "2025-07-02T10:00:00Z", width: 300, height: 200, fileName: "b.jpg" },
  ],
  music: { id: "m", fileName: "Sommer.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
  secondsPerPicture: 5,
};

async function storeWithMedia() {
  const store = new MemoryLibraryStore();
  for (const id of ["p1", "p2"]) {
    await store.putPicture(id, { display: new Blob([`display ${id}`]), thumbnail: new Blob([id]) });
  }
  await store.putMusic("m", new Blob(["tune"]));
  return store;
}

function fakeUrls() {
  const created: string[] = [];
  const revoked: string[] = [];
  return {
    created,
    revoked,
    ports: {
      create: (blob: Blob) => {
        const url = `url:${String(created.length + 1)}:${String(blob.size)}`;
        created.push(url);
        return url;
      },
      revoke: (url: string) => void revoked.push(url),
    },
  };
}

describe("player media", () => {
  it("loads the display pictures and the music of a slideshow", async () => {
    const media = await loadPlayerMedia(await storeWithMedia(), stored);
    expect(await media.pictures.get("p2")?.text()).toBe("display p2");
    expect(await media.music?.text()).toBe("tune");
  });

  it("creates a URL per picture and for the music on open, and revokes them all on close", async () => {
    const media = await loadPlayerMedia(await storeWithMedia(), stored);
    const urls = fakeUrls();

    const opened = openPlayerMedia(media, urls.ports);
    expect(opened.sources.picture("p1")).toBe(urls.created[0]);
    expect(opened.sources.music("m")).toBe(urls.created[2]);
    expect(urls.revoked).toEqual([]);

    opened.close();
    expect(urls.revoked.sort()).toEqual([...urls.created].sort());
  });

  it("fails loud for a picture it did not load", async () => {
    const media = await loadPlayerMedia(await storeWithMedia(), stored);
    const opened = openPlayerMedia(media, fakeUrls().ports);
    expect(() => opened.sources.picture("p9")).toThrow(/p9/);
  });
});
