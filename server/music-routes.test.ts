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

describe("music beats", () => {
  it("answers beats null for music no device has listened to yet", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.send("GET", `${MUSIC}/${musicId}/beats`);
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ beats: null });
  });

  it("answers 404 for beats of music the server does not have", () => {
    const library = libraryHarness();
    const response = library.send("GET", `${MUSIC}/00000000-0000-4000-8000-000000000009/beats`);
    expect(response.status).toBe(404);
  });

  it("puts beats, then reads them back", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const beats = { kind: "beats", beatsMs: [0, 500, 1000], beatsPerMinute: 120 };

    const put = library.send("PUT", `${MUSIC}/${musicId}/beats`, { body: beats });
    expect(put.status).toBe(204);

    const read = library.send("GET", `${MUSIC}/${musicId}/beats`);
    expect(read.status).toBe(200);
    expect(read.json).toEqual({ beats });
  });

  it("replaces beats put again", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    library.send("PUT", `${MUSIC}/${musicId}/beats`, {
      body: { kind: "beats", beatsMs: [0, 500], beatsPerMinute: 120 },
    });

    library.send("PUT", `${MUSIC}/${musicId}/beats`, { body: { kind: "none" } });

    const read = library.send("GET", `${MUSIC}/${musicId}/beats`);
    expect(read.json).toEqual({ beats: { kind: "none" } });
  });

  it("answers 404 putting beats for music the server does not have", () => {
    const library = libraryHarness();
    const response = library.send("PUT", `${MUSIC}/00000000-0000-4000-8000-000000000009/beats`, {
      body: { kind: "none" },
    });
    expect(response.status).toBe(404);
  });

  it("refuses an invalid beats body with 400 invalidBeats", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.send("PUT", `${MUSIC}/${musicId}/beats`, {
      body: { kind: "beats", beatsMs: [500, 0], beatsPerMinute: 120 },
    });
    expect(response.status).toBe(400);
    expect(response.json["error"]).toBe("invalidBeats");
  });

  it("refuses a beats put over MAX_DOCUMENT_BYTES with 413", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.handle({
      method: "PUT",
      path: `${MUSIC}/${musicId}/beats`,
      headers: { "content-type": "application/json" },
      body: { kind: "tooLarge" },
    });
    expect(response.status).toBe(413);
  });

  it("refuses a beats put that is not JSON with 415 notJson", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.send("PUT", `${MUSIC}/${musicId}/beats`, {
      body: { kind: "none" },
      headers: { "content-type": "text/plain" },
    });
    expect(response.status).toBe(415);
    expect(response.json["error"]).toBe("notJson");
  });
});

describe("music loudness", () => {
  it("answers loudness null for music not measured yet", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.send("GET", `${MUSIC}/${musicId}/loudness`);
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ loudness: null });
  });

  it("answers 404 for loudness of music the server does not have", () => {
    const library = libraryHarness();
    const response = library.send("GET", `${MUSIC}/00000000-0000-4000-8000-000000000009/loudness`);
    expect(response.status).toBe(404);
  });

  it("puts loudness, then reads it back", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const loudness = { blockLoudnessDb: [-20, null], hopPeaksDbfs: [-6, -4, null, -3, -2] };

    const put = library.send("PUT", `${MUSIC}/${musicId}/loudness`, { body: loudness });
    expect(put.status).toBe(204);

    const read = library.send("GET", `${MUSIC}/${musicId}/loudness`);
    expect(read.status).toBe(200);
    expect(read.json).toEqual({ loudness });
  });

  it("replaces loudness put again", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    library.send("PUT", `${MUSIC}/${musicId}/loudness`, {
      body: { blockLoudnessDb: [-20], hopPeaksDbfs: [-6, -4, -3, -2] },
    });

    const relevelled = { blockLoudnessDb: [-16], hopPeaksDbfs: [-5, -4, -3, -1] };
    library.send("PUT", `${MUSIC}/${musicId}/loudness`, { body: relevelled });

    const read = library.send("GET", `${MUSIC}/${musicId}/loudness`);
    expect(read.json).toEqual({ loudness: relevelled });
  });

  it("answers 404 putting loudness for music the server does not have", () => {
    const library = libraryHarness();
    const response = library.send(
      "PUT",
      `${MUSIC}/00000000-0000-4000-8000-000000000009/loudness`,
      { body: { blockLoudnessDb: [], hopPeaksDbfs: [] } },
    );
    expect(response.status).toBe(404);
  });

  it("refuses an invalid loudness body with 400 invalidLoudness", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.send("PUT", `${MUSIC}/${musicId}/loudness`, {
      body: { blockLoudnessDb: [-20, -18], hopPeaksDbfs: [-6] },
    });
    expect(response.status).toBe(400);
    expect(response.json["error"]).toBe("invalidLoudness");
  });

  it("refuses a loudness put over MAX_DOCUMENT_BYTES with 413", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.handle({
      method: "PUT",
      path: `${MUSIC}/${musicId}/loudness`,
      headers: { "content-type": "application/json" },
      body: { kind: "tooLarge" },
    });
    expect(response.status).toBe(413);
  });

  it("refuses a loudness put that is not JSON with 415 notJson", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    const response = library.send("PUT", `${MUSIC}/${musicId}/loudness`, {
      body: { blockLoudnessDb: [], hopPeaksDbfs: [] },
      headers: { "content-type": "text/plain" },
    });
    expect(response.status).toBe(415);
    expect(response.json["error"]).toBe("notJson");
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
