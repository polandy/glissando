import { describe, expect, it } from "vitest";
import error403 from "./fixtures/error-403.json";
import searchPage1 from "./fixtures/search-all-page-1.json";
import { PAGE_SIZE } from "./http-immich-client";
import { WHOLE_LIBRARY, type PhotoSource } from "./immich-client";
import { BASE, clientWith, FakeFetch, json, unavailableKind } from "./testing/fake-fetch";

describe("HttpImmichClient photo sources", () => {
  const SEARCH = "api/search/metadata";
  const searchFake = () => new FakeFetch().answer("POST", SEARCH, json(searchPage1));

  it.each<[string, PhotoSource, object]>([
    ["the library", WHOLE_LIBRARY, {}],
    [
      "favourites",
      { kind: "library", favoritesOnly: true, takenBefore: null },
      { isFavorite: true },
    ],
    [
      "a month jump",
      { kind: "library", favoritesOnly: false, takenBefore: "2026-01-01T00:00:00.000Z" },
      { takenBefore: "2026-01-01T00:00:00.000Z" },
    ],
    [
      "favourites before a month end",
      { kind: "library", favoritesOnly: true, takenBefore: "2026-01-01T00:00:00.000Z" },
      { isFavorite: true, takenBefore: "2026-01-01T00:00:00.000Z" },
    ],
    ["an album", { kind: "album", albumId: "a1" }, { albumIds: ["a1"] }],
    ["a person", { kind: "person", personId: "p1" }, { personIds: ["p1"] }],
  ])("searches %s with its own fields on top of the common ones", async (_name, source, extra) => {
    const fake = searchFake();

    await clientWith(fake).photos({ page: 2, source });

    expect(fake.requests[0]?.body).toEqual({
      type: "IMAGE",
      order: "desc",
      size: PAGE_SIZE,
      page: 2,
      withExif: true,
      ...extra,
    });
  });

  it("lists a folder from GET api/view/folder as one last page, hiding non-JPEGs", async () => {
    const [first, second] = searchPage1.assets.items;
    const items = [first, { ...second, originalMimeType: "image/heic" }];
    const fake = new FakeFetch().answer("GET", "api/view/folder?path=a%2Fb%20c", json(items));

    const page = await clientWith(fake).photos({
      page: 1,
      source: { kind: "folder", path: "a/b c" },
    });

    expect(page.photos.map(({ id }) => id)).toEqual([first?.id]);
    expect(page.hiddenTakenAt).toHaveLength(1);
    expect(page.nextPage).toBeNull();
  });
});

describe("HttpImmichClient timeline, people and folders", () => {
  it("maps the buckets to months with counts, in Immich's newest-first order", async () => {
    const fake = new FakeFetch().answer(
      "GET",
      "api/timeline/buckets",
      json([
        { timeBucket: "2025-07-01T00:00:00.000Z", count: 412 },
        { timeBucket: "2025-06-01", count: 3 },
      ]),
    );

    expect(await clientWith(fake).timelineMonths()).toEqual([
      { month: "2025-07", count: 412 },
      { month: "2025-06", count: 3 },
    ]);
  });

  it.each([
    ["a non-array", { buckets: [] }],
    ["a bucket without a count", [{ timeBucket: "2025-07-01" }]],
    ["a bucket start that is not a date", [{ timeBucket: "July", count: 1 }]],
    ["a bucket start with month 13", [{ timeBucket: "2025-13-01", count: 1 }]],
  ])("fails loud on %s", async (_name, answer) => {
    const fake = new FakeFetch().answer("GET", "api/timeline/buckets", json(answer));

    await expect(clientWith(fake).timelineMonths()).rejects.toThrow(/api\/timeline\/buckets/);
  });

  it("reads every page of people and keeps the named, visible ones in order", async () => {
    const person = (id: string, name: string, isHidden = false) => ({ id, name, isHidden });
    const fake = new FakeFetch()
      .answer(
        "GET",
        "api/people?withHidden=false&page=1&size=500",
        json({ people: [person("p1", "Ada"), person("p2", "")], hasNextPage: true }),
      )
      .answer(
        "GET",
        "api/people?withHidden=false&page=2&size=500",
        json({ people: [person("p3", "Bo", true), person("p4", "Cy")], hasNextPage: false }),
      );

    expect(await clientWith(fake).people()).toEqual([
      { id: "p1", name: "Ada" },
      { id: "p4", name: "Cy" },
    ]);
  });

  it("fails loud on a people answer without hasNextPage", async () => {
    const fake = new FakeFetch().answer(
      "GET",
      "api/people?withHidden=false&page=1&size=500",
      json({ people: [] }),
    );

    await expect(clientWith(fake).people()).rejects.toThrow(/hasNextPage/);
  });

  it("builds the person's same-origin keyless thumbnail address", () => {
    expect(clientWith(new FakeFetch()).personThumbnailUrl("p 1")).toBe(
      `${BASE}api/people/p%201/thumbnail`,
    );
  });

  it("reads the folder paths", async () => {
    const fake = new FakeFetch().answer("GET", "api/view/folder/unique-paths", json(["a", "a/b"]));

    expect(await clientWith(fake).folderPaths()).toEqual(["a", "a/b"]);
  });

  it("fails loud on a folder path that is not a string", async () => {
    const fake = new FakeFetch().answer("GET", "api/view/folder/unique-paths", json(["a", 1]));

    await expect(clientWith(fake).folderPaths()).rejects.toThrow(/not a string/);
  });

  it.each<[string, () => Promise<unknown>]>([
    ["timelineMonths", () => clientWith(forbidden("api/timeline/buckets")).timelineMonths()],
    ["people", () => clientWith(forbidden("api/people?withHidden=false&page=1&size=500")).people()],
    ["folderPaths", () => clientWith(forbidden("api/view/folder/unique-paths")).folderPaths()],
  ])("rejects %s with permissionMissing on a 403", async (_name, call) => {
    expect(await unavailableKind(call())).toBe("permissionMissing");
  });
});

function forbidden(path: string): FakeFetch {
  return new FakeFetch().answer("GET", path, json(error403, 403));
}
