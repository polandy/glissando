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
  it("is kept when a PUT drops the last reference, so a PUT naming it again within the grace succeeds", () => {
    const library = libraryHarness();
    const song = library.uploadMusic();
    library.advanceClock(2 * HOUR_MS);
    const id = library.create(sampleDocument("Undone", song));

    const dropped = library.send("PUT", `/api/library/slideshows/${id}`, {
      body: sampleDocument("Undone"),
      headers: { "if-match": '"1"' },
    });
    expect(dropped.status).toBe(200);
    library.advanceClock(HOUR_MS);
    library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${song}`).status).toBe(200);

    const restored = library.send("PUT", `/api/library/slideshows/${id}`, {
      body: sampleDocument("Undone", song),
      headers: { "if-match": '"2"' },
    });
    expect(restored.status).toBe(200);
  });

  it("is deleted on an upload once the grace period after a PUT dropped it has passed", () => {
    const library = libraryHarness();
    const song = library.uploadMusic();
    const id = library.create(sampleDocument("Drops", song));
    library.send("PUT", `/api/library/slideshows/${id}`, {
      body: sampleDocument("Drops"),
      headers: { "if-match": '"1"' },
    });
    library.advanceClock(HOUR_MS + 1);
    const later = library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${later}`).status).toBe(200);
    expect(library.send("GET", `${MUSIC}/${song}`).status).toBe(404);
  });

  it("is kept within the grace period after the last slideshow naming it is deleted", () => {
    const library = libraryHarness();
    const song = library.uploadMusic();
    library.advanceClock(2 * HOUR_MS);
    const id = library.create(sampleDocument("Deleted", song));
    library.send("DELETE", `/api/library/slideshows/${id}`);
    library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${song}`).status).toBe(200);
  });

  it("is deleted on the first upload after the grace period passed without one, never before", () => {
    const library = libraryHarness();
    const stale = library.uploadMusic();
    library.advanceClock(HOUR_MS);
    library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${stale}`).status).toBe(200);

    library.advanceClock(HOUR_MS + 1);
    const later = library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${later}`).status).toBe(200);
    expect(library.send("GET", `${MUSIC}/${stale}`).status).toBe(404);
  });

  it("is kept while uploads follow one another within the grace period, as in a slow multi-song save", () => {
    const library = libraryHarness();
    const first = library.uploadMusic();
    library.advanceClock(HOUR_MS - 1);
    const second = library.uploadMusic();
    library.advanceClock(HOUR_MS - 1);
    library.uploadMusic();
    expect(library.send("GET", `${MUSIC}/${first}`).status).toBe(200);
    expect(library.send("GET", `${MUSIC}/${second}`).status).toBe(200);
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
