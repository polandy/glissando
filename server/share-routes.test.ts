import { describe, expect, it } from "vitest";
import { libraryHarness } from "./testing/library-harness";
import { SLIDESHOWS, shareOf, sharedLibrary } from "./testing/shared-library";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

describe("sharing a slideshow", () => {
  it("answers 201 with a new 22-character base64url token and its creation time", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("POST", shareOf(id), { body: {} });
    expect(response.status).toBe(201);
    expect(response.json["token"]).toMatch(TOKEN_PATTERN);
    expect(response.json["createdAt"]).toBe("2026-10-01T00:00:00.000Z");
  });

  it("answers 200 with the same link when the slideshow is already shared", () => {
    const library = libraryHarness();
    const id = library.create();
    const first = library.send("POST", shareOf(id), { body: {} });
    library.advanceClock(1000);
    const again = library.send("POST", shareOf(id), { body: {} });
    expect(again.status).toBe(200);
    expect(again.json).toEqual(first.json);
  });

  it("gives each slideshow its own token", () => {
    const library = libraryHarness();
    const first = library.send("POST", shareOf(library.create()), { body: {} });
    const second = library.send("POST", shareOf(library.create()), { body: {} });
    expect(first.json["token"]).toMatch(TOKEN_PATTERN);
    expect(second.json["token"]).not.toBe(first.json["token"]);
  });

  it("answers 404 notFound for a slideshow that does not exist", () => {
    const response = libraryHarness().send("POST", shareOf("no-such-slideshow"), { body: {} });
    expect(response.status).toBe(404);
    expect(response.json["error"]).toBe("notFound");
  });

  it("refuses a request that is not application/json with 415 notJson, sharing nothing", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("POST", shareOf(id), {
      body: {},
      headers: { "content-type": "text/plain" },
    });
    expect(response.status).toBe(415);
    expect(response.json["error"]).toBe("notJson");
    expect(library.send("GET", `${SLIDESHOWS}/${id}`).json["share"]).toBeNull();
  });

  it("shows the link on the slideshow's GET and in the list, and null for one not shared", () => {
    const library = libraryHarness();
    const notShared = library.create();
    const shared = library.create();
    const link = library.send("POST", shareOf(shared), { body: {} }).json;
    expect(library.send("GET", `${SLIDESHOWS}/${shared}`).json["share"]).toEqual(link);
    expect(library.send("GET", `${SLIDESHOWS}/${notShared}`).json["share"]).toBeNull();
    expect(library.send("GET", SLIDESHOWS).json["slideshows"]).toMatchObject([
      { id: shared, share: link },
      { id: notShared, share: null },
    ]);
  });
});

describe("turning a share link off", () => {
  it("answers 204, after which the token answers 404 notShared and the slideshow shows no link", () => {
    const { library, id, token } = sharedLibrary();
    expect(library.send("GET", `/api/share/${token}`).status).toBe(200);
    expect(library.send("DELETE", shareOf(id)).status).toBe(204);
    expect(library.send("GET", `/api/share/${token}`).json["error"]).toBe("notShared");
    expect(library.send("GET", `${SLIDESHOWS}/${id}`).json["share"]).toBeNull();
  });

  it("makes a new token when the slideshow is shared again", () => {
    const { library, id, token } = sharedLibrary();
    library.send("DELETE", shareOf(id));
    const again = library.send("POST", shareOf(id), { body: {} });
    expect(again.status).toBe(201);
    expect(again.json["token"]).toMatch(TOKEN_PATTERN);
    expect(again.json["token"]).not.toBe(token);
    expect(library.send("GET", `/api/share/${token}`).status).toBe(404);
  });

  it("answers 404 notShared for a slideshow without a link and notFound for none at all", () => {
    const library = libraryHarness();
    const id = library.create();
    expect(library.send("DELETE", shareOf(id)).json["error"]).toBe("notShared");
    expect(library.send("DELETE", shareOf("no-such-slideshow")).json["error"]).toBe("notFound");
  });

  it("happens when the slideshow is deleted", () => {
    const { library, id, token } = sharedLibrary();
    library.send("DELETE", `${SLIDESHOWS}/${id}`);
    expect(library.send("GET", `/api/share/${token}`).json["error"]).toBe("notShared");
  });
});
