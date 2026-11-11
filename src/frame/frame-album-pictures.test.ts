import { describe, expect, it } from "vitest";
import type { PhotoSource } from "../immich/immich-client";
import { fetchAlbumPictures } from "./frame-album-pictures";

function photo(id: string) {
  return { id, fileName: `${id}.jpg`, takenAt: "2025-01-01T00:00:00Z", size: null };
}

describe("fetchAlbumPictures", () => {
  it("reads every page of the album, in order", async () => {
    const pages = [
      { photos: [photo("a"), photo("b")], hiddenTakenAt: [], nextPage: 2 },
      { photos: [photo("c")], hiddenTakenAt: [], nextPage: null },
    ];
    const requested: number[] = [];
    const client = {
      photos: ({ page }: { page: number }) => {
        requested.push(page);
        const found = pages[page - 1];
        if (found === undefined) throw new Error("test bug: unexpected page requested");
        return Promise.resolve(found);
      },
    };

    const pictures = await fetchAlbumPictures(client, "album-1");

    expect(pictures.map((picture) => picture.id)).toEqual(["a", "b", "c"]);
    expect(requested).toEqual([1, 2]);
  });

  it("asks every page for the given album", async () => {
    const albumIds: string[] = [];
    const client = {
      photos: ({ source }: { source: PhotoSource }) => {
        albumIds.push(source.kind === "album" ? source.albumId : "none");
        return Promise.resolve({
          photos: [],
          hiddenTakenAt: [],
          nextPage: null,
        });
      },
    };

    await fetchAlbumPictures(client, "album-1");

    expect(albumIds).toEqual(["album-1"]);
  });

  it("answers an empty list for an album with no photos", async () => {
    const client = {
      photos: () => Promise.resolve({ photos: [], hiddenTakenAt: [], nextPage: null }),
    };

    expect(await fetchAlbumPictures(client, "album-1")).toEqual([]);
  });
});
