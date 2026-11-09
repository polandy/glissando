import { describe, expect, it } from "vitest";
import type { ServerDocument } from "../src/server-library/server-document";
import { libraryHarness, sampleDocument } from "./testing/library-harness";
import { SECOND_ASSET, SLIDESHOWS, shareOf, sharedLibrary } from "./testing/shared-library";

const UNKNOWN_TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";

describe("the shared document", () => {
  it("answers the revision, the share document and each song's beats and loudness or null, never stored", () => {
    const { library, token } = sharedLibrary();
    const response = library.send("GET", `/api/share/${token}`);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json).toEqual({
      revision: 1,
      slideshow: {
        title: "Herbst in Wien",
        createdAt: "2025-10-01T00:00:00.000Z",
        secondsPerPicture: 5,
        pictures: [
          {
            capturedAt: "2025-09-01T00:00:00.000Z",
            width: 1920,
            height: 1080,
            colours: { veil: "#404040", accent: "#C0C0C0" },
          },
          {
            capturedAt: "2025-10-01T00:00:00.000Z",
            width: 1080,
            height: 1920,
            colours: { veil: "#404040", accent: "#C0C0C0" },
          },
        ],
        songs: [
          { durationMs: 60000, mimeType: "audio/mp4" },
          { durationMs: 30000, mimeType: "audio/mpeg" },
        ],
      },
      beats: [null, { kind: "none" }],
      loudness: [{ blockLoudnessDb: [-20], hopPeaksDbfs: [-10, -10, -10, -10] }, null],
    });
  });

  it("names no slideshow id, asset id or music id", () => {
    const { library, id, token, firstMusic, secondMusic } = sharedLibrary();
    const text = library.send("GET", `/api/share/${token}`).text;
    expect(text).toContain("Herbst in Wien");
    for (const secret of [id, firstMusic, secondMusic, SECOND_ASSET, "b.jpg", "second.mp3"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("is the slideshow as it is now, after an edit", () => {
    const { library, id, token } = sharedLibrary();
    const current = library.send("GET", `${SLIDESHOWS}/${id}`).json["document"] as ServerDocument;
    const edited = { ...current, slideshow: { ...current.slideshow, title: "Edited" } };
    library.send("PUT", `${SLIDESHOWS}/${id}`, { body: edited, headers: { "if-match": '"1"' } });
    expect(library.send("GET", `/api/share/${token}`).json).toMatchObject({
      revision: 2,
      slideshow: { title: "Edited" },
    });
  });

  it("answers an unknown token 404 notShared", () => {
    const response = libraryHarness().send("GET", `/api/share/${UNKNOWN_TOKEN}`);
    expect(response.status).toBe(404);
    expect(response.json["error"]).toBe("notShared");
  });
});

describe("a shared song", () => {
  it("answers the bytes of the song at its position with their Content-Type, kept a day", () => {
    const { library, token } = sharedLibrary();
    const response = library.send("GET", `/api/share/${token}/songs/1`);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("audio/mpeg");
    expect(response.headers["cache-control"]).toBe("private, max-age=86400");
    expect(response.body).toEqual(new Uint8Array([1, 2, 3]));
  });

  it.each(["2", "-1", "01", "1.0", "x"])("answers position %s 404 noSuchSong", (position) => {
    const { library, token } = sharedLibrary();
    expect(library.send("GET", `/api/share/${token}/songs/0`).status).toBe(200);
    const response = library.send("GET", `/api/share/${token}/songs/${position}`);
    expect(response.status).toBe(404);
    expect(response.json["error"]).toBe("noSuchSong");
  });

  it("answers an unknown token 404 notShared", () => {
    const response = libraryHarness().send("GET", `/api/share/${UNKNOWN_TOKEN}/songs/0`);
    expect(response.json["error"]).toBe("notShared");
  });
});

describe("the picture check Caddy's forward_auth asks", () => {
  it("answers 200 naming the Immich asset of the picture at its position", () => {
    const { library, token } = sharedLibrary();
    const response = library.send("GET", `/internal/share-picture/${token}/1`);
    expect(response.status).toBe(200);
    expect(response.headers["x-glissando-immich-asset"]).toBe(SECOND_ASSET);
  });

  it.each(["2", "-1", "01", "x"])("answers position %s 404 noSuchPicture", (position) => {
    const { library, token } = sharedLibrary();
    expect(library.send("GET", `/internal/share-picture/${token}/0`).status).toBe(200);
    const response = library.send("GET", `/internal/share-picture/${token}/${position}`);
    expect(response.status).toBe(404);
    expect(response.json["error"]).toBe("noSuchPicture");
    expect(response.headers["x-glissando-immich-asset"]).toBeUndefined();
  });

  it("answers a picture whose asset id is no UUID 404 noSuchPicture, so no path reaches Immich", () => {
    const library = libraryHarness();
    const base = sampleDocument();
    const [picture] = base.slideshow.pictures;
    if (picture === undefined) throw new Error("the sample has a picture");
    const id = library.create({
      ...base,
      slideshow: { ...base.slideshow, pictures: [{ ...picture, immichAssetId: "../users/me" }] },
    });
    const token = String(library.send("POST", shareOf(id), { body: {} }).json["token"]);
    expect(library.send("GET", `/api/share/${token}`).status).toBe(200);
    const response = library.send("GET", `/internal/share-picture/${token}/0`);
    expect(response.json["error"]).toBe("noSuchPicture");
  });

  it("answers an unknown token 404 notShared", () => {
    const response = libraryHarness().send("GET", `/internal/share-picture/${UNKNOWN_TOKEN}/0`);
    expect(response.json["error"]).toBe("notShared");
  });
});

describe("every other method or path under /api/share/", () => {
  it.each([
    ["GET", "/api/share"],
    ["GET", "/api/share/"],
    ["POST", "/api/share/TOKEN"],
    ["DELETE", "/api/share/TOKEN"],
    ["GET", "/api/share/TOKEN/"],
    ["GET", "/api/share/TOKEN/songs"],
    ["PUT", "/api/share/TOKEN/songs/0"],
    ["GET", "/api/share/TOKEN/1/pictures/0"],
    ["GET", "/api/share/TOKEN/other"],
    ["POST", "/internal/share-picture/TOKEN/0"],
    ["GET", "/internal/share-picture/TOKEN"],
  ])("%s %s answers 404", (method, pattern) => {
    const { library, token } = sharedLibrary();
    expect(library.send("GET", `/api/share/${token}`).status).toBe(200);
    const response = library.send(method, pattern.replace("TOKEN", token));
    expect(response.status).toBe(404);
    expect(response.json["error"]).toBe("notFound");
  });
});

describe("the log of share requests", () => {
  it("names each request with the token replaced by …", () => {
    const { library, token } = sharedLibrary();
    library.send("GET", `/api/share/${token}`);
    library.send("GET", `/api/share/${token}/songs/0`);
    library.send("GET", `/internal/share-picture/${token}/0`);
    expect(library.logged.slice(-3)).toEqual([
      "GET /api/share/… 200",
      "GET /api/share/…/songs/0 200",
      "GET /internal/share-picture/…/0 200",
    ]);
    expect(library.logged.join("\n")).not.toContain(token);
  });
});
