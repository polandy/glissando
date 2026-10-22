import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { mp3 } from "./testing/song-intake-fixtures";
import { deviceSongStorage, serverSongStorage } from "./song-intake";

describe("deviceSongStorage, sample music", () => {
  it("claims a sample track's fixed id, writing nothing new when it is already stored", async () => {
    const store = new MemoryLibraryStore();
    const claims: string[] = [];
    let ids = 0;
    const storage = deviceSongStorage({
      store: {
        claimMedia: (claimId, _at, mediaId) => {
          claims.push(`claim ${claimId} ${mediaId}`);
          return Promise.resolve();
        },
        releaseClaim: (claimId) => {
          claims.push(`release ${claimId}`);
          return Promise.resolve();
        },
        putMusic: (id, blob) => store.putMusic(id, blob),
      },
      newId: () => `id-${(ids += 1)}`,
      now: () => new Date("2026-10-11T12:00:00Z"),
    });

    const stored = await storage.storeSample(
      mp3("Hold the Frame.mp3"),
      "sample-hold-the-frame",
      true,
    );
    await stored.release();

    expect(stored.id).toBe("sample-hold-the-frame");
    await expect(store.musicBlob("sample-hold-the-frame")).rejects.toThrow();
    expect(claims).toEqual(["claim id-1 sample-hold-the-frame", "release id-1"]);
  });
});

describe("serverSongStorage, sample music", () => {
  it("uploads a sample track like any other song, ignoring the device's fixed id", async () => {
    const uploads: string[] = [];
    const storage = serverSongStorage({
      uploadMusic: async (audio, mimeType) => {
        uploads.push(`${await audio.text()} ${mimeType}`);
        return "music-8";
      },
    });

    const stored = await storage.storeSample(
      mp3("Hold the Frame.mp3"),
      "sample-hold-the-frame",
      true,
    );

    expect(stored.id).toBe("music-8");
    expect(uploads).toEqual(["ID3 tune audio/mpeg"]);
  });
});
