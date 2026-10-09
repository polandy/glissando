import { describe, expect, it } from "vitest";
import albumsFixture from "./fixtures/albums.json";
import error401 from "./fixtures/error-401.json";
import error403 from "./fixtures/error-403.json";
import facesOne from "./fixtures/faces-one.json";
import searchAlbum from "./fixtures/search-album.json";
import searchLastPage from "./fixtures/search-all-last-page.json";
import searchPage1 from "./fixtures/search-all-page-1.json";
import serverVersion from "./fixtures/server-version.json";
import { HttpImmichClient, PAGE_SIZE } from "./http-immich-client";
import { ImmichUnavailableError, type ImmichUnavailableKind } from "./immich-client";

const BASE = "https://glissando.example/app/immich/";

interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly body: unknown;
  readonly headers: Headers;
  readonly redirect: RequestRedirect | undefined;
}

type FakeAnswer = () => Response;

/** Answers by "METHOD url"; an unknown request fails the test loudly. */
class FakeFetch {
  readonly requests: RecordedRequest[] = [];
  readonly #answers = new Map<string, FakeAnswer>();

  answer(method: string, path: string, answer: FakeAnswer): this {
    this.#answers.set(`${method} ${BASE}${path}`, answer);
    return this;
  }

  readonly fetch: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    this.requests.push({
      method,
      url,
      body,
      headers: new Headers(init?.headers),
      redirect: init?.redirect,
    });
    const answer = this.#answers.get(`${method} ${url}`);
    if (answer === undefined) {
      return Promise.reject(new Error(`the fake fetch has no answer for ${method} ${url}`));
    }
    try {
      return Promise.resolve(answer());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const html =
  (status = 200) =>
  () =>
    new Response("<!doctype html><title>Glissando</title>", {
      status,
      headers: { "content-type": "text/html" },
    });

const status = (code: number) => () => new Response("", { status: code });

const networkDown = () => {
  throw new TypeError("Failed to fetch");
};

/** What `fetch` resolves to for a redirect under `redirect: "manual"`. */
const opaqueRedirect = () => {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaqueredirect" });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
};

function clientWith(fake: FakeFetch): HttpImmichClient {
  return new HttpImmichClient({ baseUrl: BASE, fetch: fake.fetch });
}

async function unavailableKind(promise: Promise<unknown>): Promise<ImmichUnavailableKind> {
  const error: unknown = await promise.then(
    () => new Error("expected the request to fail"),
    (rejection: unknown) => rejection,
  );
  if (!(error instanceof ImmichUnavailableError)) {
    throw new Error(`expected an ImmichUnavailableError, got ${String(error)}`);
  }
  return error.kind;
}

describe("HttpImmichClient.status", () => {
  it("is available with Immich's version and the album count", async () => {
    const fake = new FakeFetch()
      .answer("GET", "api/server/version", json(serverVersion))
      .answer("GET", "api/albums", json(albumsFixture));

    expect(await clientWith(fake).status()).toEqual({
      kind: "available",
      version: "3.3.1",
      albumCount: 2,
    });
  });

  it.each([
    ["a 404", status(404)],
    ["HTML from a static host's fallback", html()],
  ])("is notSetUp when the version answers with %s", async (_name, answer) => {
    const fake = new FakeFetch().answer("GET", "api/server/version", answer);

    expect(await clientWith(fake).status()).toEqual({ kind: "notSetUp" });
  });

  it.each<[string, FakeAnswer, ImmichUnavailableKind]>([
    ["a network failure", networkDown, "offline"],
    ["a 502", status(502), "unreachable"],
    ["a 503", status(503), "unreachable"],
    ["a 504", status(504), "unreachable"],
    ["a redirect to the owner's sign-in", opaqueRedirect, "signInExpired"],
  ])("maps %s of the version request to %s", async (_name, answer, kind) => {
    const fake = new FakeFetch().answer("GET", "api/server/version", answer);

    expect(await clientWith(fake).status()).toEqual({ kind });
  });

  it.each<[string, FakeAnswer, ImmichUnavailableKind]>([
    ["401", json(error401, 401), "keyRejected"],
    ["403", json(error403, 403), "permissionMissing"],
    ["502", status(502), "unreachable"],
  ])("maps a %s of the albums request to %s", async (_name, answer, kind) => {
    const fake = new FakeFetch()
      .answer("GET", "api/server/version", json(serverVersion))
      .answer("GET", "api/albums", answer);

    expect(await clientWith(fake).status()).toEqual({ kind });
  });

  it("follows no redirect itself, so a sign-in redirect is seen", async () => {
    const fake = new FakeFetch().answer("GET", "api/server/version", opaqueRedirect);

    await clientWith(fake).status();

    expect(fake.requests.map((request) => request.redirect)).toEqual(["manual"]);
  });

  it("fails loud on a version answer that is not Immich's shape", async () => {
    const fake = new FakeFetch().answer("GET", "api/server/version", json({ major: "3" }));

    await expect(clientWith(fake).status()).rejects.toThrow(/"major"/);
  });
});

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

describe("HttpImmichClient failures", () => {
  it.each<[string, FakeAnswer, ImmichUnavailableKind]>([
    ["a network failure", networkDown, "offline"],
    ["a 401", json(error401, 401), "keyRejected"],
    ["a 403", json(error403, 403), "permissionMissing"],
    ["a 504", status(504), "unreachable"],
    ["a redirect to the owner's sign-in", opaqueRedirect, "signInExpired"],
  ])("rejects %s with ImmichUnavailableError %s", async (_name, answer, kind) => {
    const fake = new FakeFetch().answer("GET", "api/albums", answer);

    expect(await unavailableKind(clientWith(fake).albums())).toBe(kind);
  });

  it("throws a plain error naming method, path and status for another failure", async () => {
    const fake = new FakeFetch().answer("GET", "api/assets/gone/original", status(404));

    const failure = clientWith(fake).original("gone");

    await expect(failure).rejects.toThrow("GET api/assets/gone/original answered 404");
    await expect(failure).rejects.not.toBeInstanceOf(ImmichUnavailableError);
  });

  it("refuses a base URL without a trailing slash", () => {
    expect(
      () => new HttpImmichClient({ baseUrl: "https://glissando.example/immich", fetch }),
    ).toThrow(/end with "\/"/);
  });
});
