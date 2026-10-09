import { describe, expect, it } from "vitest";
import albumsFixture from "./fixtures/albums.json";
import error401 from "./fixtures/error-401.json";
import error403 from "./fixtures/error-403.json";
import serverVersion from "./fixtures/server-version.json";
import { HttpImmichClient } from "./http-immich-client";
import {
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
