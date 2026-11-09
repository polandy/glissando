import { describe, expect, it } from "vitest";
import { libraryHarness } from "./testing/library-harness";

const MUSIC = "/api/library/music";

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
    const response = library.send("PUT", `${MUSIC}/00000000-0000-4000-8000-000000000009/loudness`, {
      body: { blockLoudnessDb: [], hopPeaksDbfs: [] },
    });
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
    expect(response.json["detail"]).toMatch(/"blockLoudnessDb" entries/);
  });

  it("lets an unexpected failure storing loudness through, for a 500 instead of a 400", () => {
    const library = libraryHarness();
    const musicId = library.uploadMusic();
    library.repository.putMusicLoudness = () => {
      throw new TypeError("a bug in the repository");
    };

    expect(() =>
      library.send("PUT", `${MUSIC}/${musicId}/loudness`, {
        body: { blockLoudnessDb: [], hopPeaksDbfs: [] },
      }),
    ).toThrow(TypeError);
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
