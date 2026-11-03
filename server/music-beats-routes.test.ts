import { describe, expect, it } from "vitest";
import { libraryHarness } from "./testing/library-harness";

const MUSIC = "/api/library/music";

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
