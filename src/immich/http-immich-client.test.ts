import { describe, expect, it } from "vitest";
import albumsFixture from "./fixtures/albums.json";
import error401 from "./fixtures/error-401.json";
import error403 from "./fixtures/error-403.json";
import serverVersion from "./fixtures/server-version.json";
import { HttpImmichClient } from "./http-immich-client";
import {
  ImmichDownloadTooLargeError,
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichUnavailableKind,
} from "./immich-client";
import {
  clientWith,
  FakeFetch,
  html,
  json,
  networkDown,
  opaqueRedirect,
  status,
  unavailableKind,
  type FakeAnswer,
} from "./testing/fake-fetch";

const TIMELINE = "api/timeline/buckets";
const PEOPLE_PROBE = "api/people?withHidden=false&page=1&size=1";
const FOLDER_PATHS = "api/view/folder/unique-paths";

/** A fake whose optional-permission probes all succeed, except those given another answer. */
function availableFake(probes: Partial<Record<string, FakeAnswer>> = {}): FakeFetch {
  return new FakeFetch()
    .answer("GET", "api/server/version", json(serverVersion))
    .answer("GET", "api/albums", json(albumsFixture))
    .answer("GET", TIMELINE, probes[TIMELINE] ?? json([]))
    .answer("GET", PEOPLE_PROBE, probes[PEOPLE_PROBE] ?? json({ people: [], hasNextPage: false }))
    .answer("GET", FOLDER_PATHS, probes[FOLDER_PATHS] ?? json([]));
}

describe("HttpImmichClient.status", () => {
  it("is available with Immich's version, the album count and no missing permission", async () => {
    expect(await clientWith(availableFake()).status()).toEqual({
      kind: "available",
      version: "3.3.1",
      albumCount: 2,
      missingPermissions: [],
    });
  });

  it.each<[string, string[]]>([
    [TIMELINE, ["timeline.read"]],
    [PEOPLE_PROBE, ["person.read"]],
    [FOLDER_PATHS, ["folder.read"]],
  ])("names the permission whose probe %s answers 403", async (path, missing) => {
    const fake = availableFake({ [path]: json(error403, 403) });

    expect(await clientWith(fake).status()).toEqual(
      expect.objectContaining({ kind: "available", missingPermissions: missing }),
    );
  });

  it("names all three optional permissions when all three probes answer 403", async () => {
    const forbidden = json(error403, 403);
    const fake = availableFake({
      [TIMELINE]: forbidden,
      [PEOPLE_PROBE]: forbidden,
      [FOLDER_PATHS]: forbidden,
    });

    expect(await clientWith(fake).status()).toEqual(
      expect.objectContaining({
        missingPermissions: ["timeline.read", "person.read", "folder.read"],
      }),
    );
  });

  it("is unavailable, not permission-missing, when a probe fails otherwise", async () => {
    const fake = availableFake({ [TIMELINE]: status(502) });

    expect(await clientWith(fake).status()).toEqual({ kind: "unreachable" });
  });

  it("never sends an API key", async () => {
    const fake = availableFake();

    await clientWith(fake).status();

    expect(fake.requests).toHaveLength(5);
    expect(fake.requests.every((request) => !request.headers.has("x-api-key"))).toBe(true);
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

  it("cancels downloading a picture with the caller's signal", async () => {
    const fake = new FakeFetch()
      .answer("GET", "api/assets/a/original", () => new Response("original"))
      .answer("GET", "api/assets/a/thumbnail?size=preview", () => new Response("preview"));
    const cancel = new AbortController();

    await clientWith(fake).original("a", cancel.signal);
    await clientWith(fake).thumbnail("a", "preview", cancel.signal);

    expect(fake.requests.map((request) => request.url)).toHaveLength(2);
    expect(fake.requests.map((request) => request.signal)).toEqual([cancel.signal, cancel.signal]);
  });

  it("refuses a video Immich announces as over maxBytes, cancelling its body unread", async () => {
    const body = { pulled: false, cancelled: false };
    const stream = new ReadableStream<Uint8Array>(
      {
        pull: () => void (body.pulled = true),
        cancel: () => void (body.cancelled = true),
      },
      { highWaterMark: 0 },
    );
    const fake = new FakeFetch().answer(
      "GET",
      "api/assets/clip-1/video/playback",
      () => new Response(stream, { headers: { "content-length": "5" } }),
    );

    const refusal = await clientWith(fake)
      .video("clip-1", 4)
      .catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ImmichDownloadTooLargeError);
    expect(body).toEqual({ pulled: false, cancelled: true });
  });

  it("downloads a video Immich announces at exactly maxBytes", async () => {
    const fake = new FakeFetch().answer(
      "GET",
      "api/assets/clip-1/video/playback",
      () => new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "content-length": "4" } }),
    );

    expect((await clientWith(fake).video("clip-1", 4)).size).toBe(4);
  });

  it("fails loud on a version answer that is not Immich's shape", async () => {
    const fake = new FakeFetch().answer("GET", "api/server/version", json({ major: "3" }));

    await expect(clientWith(fake).status()).rejects.toThrow(/"major"/);
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

  it.each([400, 404, 500])(
    "rejects another %i with ImmichRequestFailedError naming method, path and status",
    async (code) => {
      const fake = new FakeFetch().answer("GET", "api/assets/gone/original", status(code));

      const failure: unknown = await clientWith(fake)
        .original("gone")
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ImmichRequestFailedError);
      expect((failure as ImmichRequestFailedError).status).toBe(code);
      expect((failure as Error).message).toBe(
        `GET api/assets/gone/original answered ${String(code)}`,
      );
      expect(failure).not.toBeInstanceOf(ImmichUnavailableError);
    },
  );

  it("keeps a plain error for an answer that does not match Immich's API", async () => {
    const fake = new FakeFetch().answer("GET", "api/albums", json({ albums: [] }));

    const failure: unknown = await clientWith(fake)
      .albums()
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(ImmichRequestFailedError);
  });

  it("refuses a base URL without a trailing slash", () => {
    expect(
      () => new HttpImmichClient({ baseUrl: "https://glissando.example/immich", fetch }),
    ).toThrow(/end with "\/"/);
  });
});
