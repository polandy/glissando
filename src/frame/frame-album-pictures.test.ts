import { describe, expect, it } from "vitest";
import { fetchAlbumPictures } from "./frame-album-pictures";

function photo(id: string) {
  return { id, fileName: `${id}.jpg`, takenAt: "2025-01-01T00:00:00Z", size: null };
}

describe("fetchAlbumPictures", () => {
  it("reads every page of the album, in order", async () => {
    const pages = [
      { photos: [photo("a"), photo("b")], nextPage: 2 },
      { photos: [photo("c")], nextPage: null },
    ];
    const requested: number[] = [];
    const client = {
      photos: ({ page }: { page: number }) => {
        requested.push(page);
        return Promise.resolve(pages[page - 1]!);
      },
    };

    const pictures = await fetchAlbumPictures(client, "album-1");

    expect(pictures.map((picture) => picture.id)).toEqual(["a", "b", "c"]);
    expect(requested).toEqual([1, 2]);
  });

  it("asks every page for the given album", async () => {
    const albumIds: string[] = [];
    const client = {
      photos: ({ albumId }: { albumId?: string }) => {
        albumIds.push(albumId ?? "none");
        return Promise.resolve({ photos: [], nextPage: null });
      },
    };

    await fetchAlbumPictures(client, "album-1");

    expect(albumIds).toEqual(["album-1"]);
  });

  it("answers an empty list for an album with no photos", async () => {
    const client = { photos: () => Promise.resolve({ photos: [], nextPage: null }) };

    expect(await fetchAlbumPictures(client, "album-1")).toEqual([]);
  });
});
