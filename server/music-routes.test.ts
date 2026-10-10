import { describe, expect, it } from "vitest";
import { maxBodyBytes } from "./library-http";
import { libraryHarness, sampleDocument } from "./testing/library-harness";

const MUSIC = "/api/library/music";
const HOUR_MS = 60 * 60 * 1000;
const MIB = 1024 * 1024;

describe("uploading music", () => {
  it("answers 201 with its musicId; the music reads back with its bytes and content type", () => {
    const library = libraryHarness();
    const bytes = new Uint8Array([73, 68, 51, 4]);
    const uploaded = library.send("POST", MUSIC, {
      body: bytes,
      headers: { "content-type": "audio/mpeg" },
    });
    expect(uploaded.status).toBe(201);
    expect(uploaded.json).toEqual({ musicId: "00000000-0000-4000-8000-000000000001" });

    const read = library.send("GET", `${MUSIC}/00000000-0000-4000-8000-000000000001`);
    expect(read.status).toBe(200);
    expect(read.headers["content-type"]).toBe("audio/mpeg");
    expect(read.body).toEqual(bytes);
  });

  it.each([["text/plain"], ["image/jpeg"], [undefined]])(
    "refuses content type %s with 415 notAudio",
    (contentType) => {
      const response = libraryHarness().send("POST", MUSIC, {
        body: new Uint8Array([1]),
        headers: contentType === undefined ? {} : { "content-type": contentType },
      });
      expect(response.status).toBe(415);
      expect(response.json["error"]).toBe("notAudio");
    },
  );

  it("refuses a body over MAX_MUSIC_BYTES with 413", () => {
    const response = libraryHarness().handle({
      method: "POST",
      path: MUSIC,
      headers: { "content-type": "audio/mp4" },
      body: { kind: "tooLarge" },
    });
    expect(response.status).toBe(413);
  });

  it("answers 404 for music the server does not have", () => {
    const response = libraryHarness().send("GET", `${MUSIC}/00000000-0000-4000-8000-000000000009`);
    expect(response.status).toBe(404);
  });
});

describe("body limits", () => {
  it("allows 200 MiB of music and 2 MiB everywhere else", () => {
    expect(maxBodyBytes(MUSIC)).toBe(200 * MIB);
    expect(maxBodyBytes("/api/library/slideshows")).toBe(2 * MIB);
    expect(maxBodyBytes("/api/library/slideshows/x")).toBe(2 * MIB);
  });
});

describe("music no slideshow references", () => {
  it("is deleted when a PUT drops the last reference, and kept while another slideshow names it", () => {
    const library = libraryHarness();
    const shared = library.uploadMusic();
    const first = library.create(sampleDocument("First", shared));
    const second = library.create(sampleDocument("Second", shared));
    const headers = { "if-match": '"1"' };

    library.send("PUT", `/api/library/slideshows/${first}`, { body: sampleDocument(), headers });
    expect(library.send("GET", `${MUSIC}/${shared}`).status).toBe(200);

    library.send("PUT", `/api/library/slideshows/${second}`, { body: sampleDocument(), headers });
    expect(library.send("GET", `${MUSIC}/${shared}`).status).toBe(404);
  });

  it("is deleted with the last slideshow that named it", () => {
    const library = libraryHarness();
    const kept = library.uploadMusic();
    const dropped = library.uploadMusic();
    library.create(sampleDocument("Keeps", kept));
    const id = library.create(sampleDocument("Drops", dropped));
    library.send("DELETE", `/api/library/slideshows/${id}`);
    expect(library.send("GET", `${MUSIC}/${kept}`).status).toBe(200);
    expect(library.send("GET", `${MUSIC}/${dropped}`).status).toBe(404);
  });

  it("is deleted on an upload once it is older than the grace period, never before", () => {
    const library = libraryHarness();
    const stale = library.uploadMusic();
    library.advanceClock(HOUR_MS);
    const recent = library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${stale}`).status).toBe(200);

    library.advanceClock(1);
    library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${recent}`).status).toBe(200);
    expect(library.send("GET", `${MUSIC}/${stale}`).status).toBe(404);
  });

  it("is kept past the grace period while a slideshow names it", () => {
    const library = libraryHarness();
    const used = library.uploadMusic();
    library.create(sampleDocument("Uses it", used));
    library.advanceClock(2 * HOUR_MS);
    library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${used}`).status).toBe(200);
  });
});
