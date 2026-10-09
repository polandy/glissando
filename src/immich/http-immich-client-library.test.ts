import { describe, expect, it } from "vitest";
import albumsFixture from "./fixtures/albums.json";
import facesOne from "./fixtures/faces-one.json";
import searchAlbum from "./fixtures/search-album.json";
import searchLastPage from "./fixtures/search-all-last-page.json";
import searchPage1 from "./fixtures/search-all-page-1.json";
import serverVersion from "./fixtures/server-version.json";
import { PAGE_SIZE } from "./http-immich-client";
import { BASE, clientWith, FakeFetch, json } from "./testing/fake-fetch";

describe("HttpImmichClient reading the library", () => {
  it("maps Immich's albums", async () => {
    const fake = new FakeFetch().answer("GET", "api/albums", json(albumsFixture));

    const albums = await clientWith(fake).albums();

    expect(albums[0]).toEqual({
      id: "81d82341-f78f-43b8-8b6a-9e156b52f550",
      name: "Landscapes Lab",
      photoCount: 3,
      coverId: "8e726f72-b602-4950-9d3c-95df4c1cc362",
      startDate: "2019-07-01T00:00:00.000Z",
      endDate: "2019-07-03T00:00:00.000Z",
    });
    expect(albums).toHaveLength(2);
  });

  it("maps an empty album's missing cover and dates to null", async () => {
    const [album] = albumsFixture;
    const empty = {
      ...album,
      assetCount: 0,
      albumThumbnailAssetId: null,
      startDate: undefined,
      endDate: undefined,
    };
    const fake = new FakeFetch().answer("GET", "api/albums", json([empty]));

    expect(await clientWith(fake).albums()).toEqual([
      expect.objectContaining({ photoCount: 0, coverId: null, startDate: null, endDate: null }),
    ]);
  });

  it("asks for one page of images, newest first, and maps the photos", async () => {
    const fake = new FakeFetch().answer("POST", "api/search/metadata", json(searchPage1));

    const page = await clientWith(fake).photos({ page: 1 });

    expect(fake.requests[0]?.body).toEqual({
      type: "IMAGE",
      order: "desc",
      size: PAGE_SIZE,
      page: 1,
    });
    expect(fake.requests[0]?.headers.get("content-type")).toBe("application/json");
    expect(page.photos[0]).toEqual({
      id: "3f16f3f8-e346-4991-a491-12c925a9d879",
      fileName: "face6_rotated.jpg",
      takenAt: "2025-07-12T14:30:00.000Z",
    });
    expect(page.photos).toHaveLength(3);
    expect(page.nextPage).toBe(2);
  });

  it("asks for one album's photos and ends at the last page", async () => {
    const fake = new FakeFetch().answer("POST", "api/search/metadata", json(searchAlbum));

    const page = await clientWith(fake).photos({ page: 1, albumId: "album-1" });

    expect(fake.requests[0]?.body).toEqual({
      type: "IMAGE",
      order: "desc",
      size: PAGE_SIZE,
      page: 1,
      albumIds: ["album-1"],
    });
    expect(page.photos).toHaveLength(6);
    expect(page.nextPage).toBeNull();
  });

  it("reads an empty last page", async () => {
    const fake = new FakeFetch().answer("POST", "api/search/metadata", json(searchLastPage));

    expect(await clientWith(fake).photos({ page: 2 })).toEqual({ photos: [], nextPage: null });
  });

  it("fails loud naming the field when a photo lacks its file name", async () => {
    const broken = structuredClone(searchPage1) as { assets: { items: object[] } };
    broken.assets.items[0] = { id: "x", localDateTime: "2025-07-12T14:30:00.000Z" };
    const fake = new FakeFetch().answer("POST", "api/search/metadata", json(broken));

    await expect(clientWith(fake).photos({ page: 1 })).rejects.toThrow(/"originalFileName"/);
  });

  it("fails loud on a next page that is not a page number", async () => {
    const broken = structuredClone(searchPage1) as { assets: { nextPage: unknown } };
    broken.assets.nextPage = "two";
    const fake = new FakeFetch().answer("POST", "api/search/metadata", json(broken));

    await expect(clientWith(fake).photos({ page: 1 })).rejects.toThrow(/"nextPage".*"two"/);
  });

  it("maps a photo's faces", async () => {
    const fake = new FakeFetch().answer("GET", "api/faces?id=photo-1", json(facesOne));

    expect(await clientWith(fake).faces("photo-1")).toEqual([
      { imageWidth: 1280, imageHeight: 1649, x1: 329, y1: 242, x2: 845, y2: 1030 },
    ]);
  });

  it("loads a thumbnail and an original as blobs", async () => {
    const bytes = () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    const fake = new FakeFetch()
      .answer("GET", "api/assets/photo-1/thumbnail?size=preview", bytes)
      .answer("GET", "api/assets/photo-1/original", bytes);
    const client = clientWith(fake);

    expect((await client.thumbnail("photo-1", "preview")).size).toBe(3);
    expect((await client.original("photo-1")).size).toBe(3);
  });

  it("gives the absolute same-origin URL of a small thumbnail", () => {
    expect(clientWith(new FakeFetch()).thumbnailUrl("photo-1")).toBe(
      `${BASE}api/assets/photo-1/thumbnail?size=thumbnail`,
    );
  });

  it("never sends an API key", async () => {
    const fake = new FakeFetch()
      .answer("GET", "api/server/version", json(serverVersion))
      .answer("GET", "api/albums", json(albumsFixture))
      .answer("POST", "api/search/metadata", json(searchPage1));
    const client = clientWith(fake);

    await client.status();
    await client.photos({ page: 1 });

    expect(fake.requests).toHaveLength(3);
    expect(fake.requests.map((request) => request.headers.has("x-api-key"))).toEqual([
      false,
      false,
      false,
    ]);
  });
});
