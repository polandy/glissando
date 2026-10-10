import { describe, expect, it } from "vitest";
import { libraryHarness, sampleDocument } from "./testing/library-harness";

const SLIDESHOWS = "/api/library/slideshows";
const at = (id: string) => `${SLIDESHOWS}/${id}`;

describe("the discovery", () => {
  it("GET /api/library names the service and its version", () => {
    const response = libraryHarness().send("GET", "/api/library");
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ service: "glissando-library", version: 1 });
  });
});

describe("every other method or path", () => {
  it.each([
    ["GET", "/api/library/"],
    ["POST", "/api/library"],
    ["GET", "/api/library/other"],
    ["PATCH", at("00000000-0000-4000-8000-000000000001")],
    ["GET", `${at("00000000-0000-4000-8000-000000000001")}/more`],
    ["DELETE", SLIDESHOWS],
    ["PUT", "/api/library/music/x"],
  ])("%s %s answers 404 notFound", (method, path) => {
    const response = libraryHarness().send(method, path);
    expect(response.status).toBe(404);
    expect(response.json["error"]).toBe("notFound");
  });
});

describe("creating a slideshow", () => {
  it("answers 201 with its new id and revision 1, and reads back as created", () => {
    const library = libraryHarness();
    const created = library.send("POST", SLIDESHOWS, { body: sampleDocument() });
    expect(created.status).toBe(201);
    expect(created.json).toEqual({ id: "00000000-0000-4000-8000-000000000001", revision: 1 });

    const read = library.send("GET", at("00000000-0000-4000-8000-000000000001"));
    expect(read.status).toBe(200);
    expect(read.headers["etag"]).toBe('"1"');
    expect(read.json).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      revision: 1,
      document: sampleDocument(),
    });
  });

  it("refuses a body that is no JSON with 400 invalidDocument", () => {
    const response = libraryHarness().send("POST", SLIDESHOWS, {
      body: new TextEncoder().encode("{not json"),
    });
    expect(response.status).toBe(400);
    expect(response.json["error"]).toBe("invalidDocument");
  });

  it("refuses an invalid document with 400, naming the path and value", () => {
    const document = sampleDocument();
    const invalid = { ...document, slideshow: { ...document.slideshow, secondsPerPicture: 99 } };
    const response = libraryHarness().send("POST", SLIDESHOWS, { body: invalid });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      error: "invalidDocument",
      detail: "slideshow.secondsPerPicture: expected a number from 2 to 15, got 99",
    });
  });

  it("refuses a document naming music the server does not have with 409 musicMissing", () => {
    const library = libraryHarness();
    const response = library.send("POST", SLIDESHOWS, {
      body: sampleDocument("With music", "00000000-0000-4000-8000-00000000abcd"),
    });
    expect(response.status).toBe(409);
    expect(response.json["error"]).toBe("musicMissing");
    expect(library.send("GET", SLIDESHOWS).json).toEqual({ slideshows: [] });
  });

  it("refuses a body over 2 MiB with 413", () => {
    const response = libraryHarness().handle({
      method: "POST",
      path: SLIDESHOWS,
      headers: {},
      body: { kind: "tooLarge" },
    });
    expect(response.status).toBe(413);
    expect(response.json["error"]).toBe("tooLarge");
  });
});

describe("listing slideshows", () => {
  it("answers every slideshow with id, revision and document, the newest created first", () => {
    const library = libraryHarness();
    const older = library.create(sampleDocument("Older"));
    library.advanceClock(1000);
    const newer = library.create(sampleDocument("Newer"));
    expect(library.send("GET", SLIDESHOWS).json).toEqual({
      slideshows: [
        { id: newer, revision: 1, document: sampleDocument("Newer") },
        { id: older, revision: 1, document: sampleDocument("Older") },
      ],
    });
  });
});

describe("replacing a slideshow", () => {
  it("with the current revision in If-Match answers the next revision and keeps the document", () => {
    const library = libraryHarness();
    const id = library.create();
    const replaced = library.send("PUT", at(id), {
      body: sampleDocument("Edited"),
      headers: { "if-match": '"1"' },
    });
    expect(replaced.status).toBe(200);
    expect(replaced.json).toEqual({ revision: 2 });
    const read = library.send("GET", at(id));
    expect(read.headers["etag"]).toBe('"2"');
    expect(read.json["document"]).toEqual(sampleDocument("Edited"));
  });

  it("with a stale revision answers 412 revisionChanged with the current version, unchanged", () => {
    const library = libraryHarness();
    const id = library.create();
    library.send("PUT", at(id), {
      body: sampleDocument("First edit"),
      headers: { "if-match": '"1"' },
    });
    const stale = library.send("PUT", at(id), {
      body: sampleDocument("Second edit"),
      headers: { "if-match": '"1"' },
    });
    expect(stale.status).toBe(412);
    expect(stale.json["error"]).toBe("revisionChanged");
    const current = { id, revision: 2, document: sampleDocument("First edit") };
    expect(stale.json["current"]).toEqual(current);
    expect(library.send("GET", at(id)).json).toEqual(current);
  });

  it.each(["1", "*", '"x"', 'W/"1"'])("treats If-Match %s as not the current revision", (tag) => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("PUT", at(id), {
      body: sampleDocument("Edited"),
      headers: { "if-match": tag },
    });
    expect(response.status).toBe(412);
  });

  it("without If-Match answers 428", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("PUT", at(id), { body: sampleDocument("Edited") });
    expect(response.status).toBe(428);
    expect(response.json["error"]).toBe("revisionRequired");
  });

  it("answers 404 for a slideshow that does not exist", () => {
    const response = libraryHarness().send("PUT", at("00000000-0000-4000-8000-000000000009"), {
      body: sampleDocument(),
      headers: { "if-match": '"1"' },
    });
    expect(response.status).toBe(404);
  });

  it("refuses an invalid document with 400 and a document naming missing music with 409", () => {
    const library = libraryHarness();
    const id = library.create();
    const headers = { "if-match": '"1"' };
    const { slideshow } = sampleDocument();
    const invalid = { ...sampleDocument(), slideshow: { ...slideshow, title: "" } };
    expect(library.send("PUT", at(id), { body: invalid, headers }).status).toBe(400);
    const withMissingMusic = sampleDocument("Edited", "00000000-0000-4000-8000-00000000abcd");
    expect(library.send("PUT", at(id), { body: withMissingMusic, headers }).status).toBe(409);
    expect(library.send("GET", at(id)).json["revision"]).toBe(1);
  });
});

describe("deleting a slideshow", () => {
  it("answers 204, after which the slideshow is gone", () => {
    const library = libraryHarness();
    const kept = library.create(sampleDocument("Kept"));
    const id = library.create();
    const deleted = library.send("DELETE", at(id));
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(library.send("GET", at(kept)).status).toBe(200);
    expect(library.send("GET", at(id)).status).toBe(404);
  });

  it("answers 404 for a slideshow that does not exist", () => {
    const response = libraryHarness().send("DELETE", at("00000000-0000-4000-8000-000000000009"));
    expect(response.status).toBe(404);
  });
});

describe("the log", () => {
  it("has one line per request with method, path and status, never a body", () => {
    const library = libraryHarness();
    library.send("GET", "/api/library");
    library.send("POST", SLIDESHOWS, { body: sampleDocument("A private title") });
    expect(library.logged).toEqual(["GET /api/library 200", "POST /api/library/slideshows 201"]);
  });
});
