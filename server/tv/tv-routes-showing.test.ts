import { describe, expect, it } from "vitest";
import { tvHarness } from "./testing/tv-routes-harness";

const SECRET_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const UNKNOWN_KEY = "AAAAAAAAAAAAAAAAAAAAAA";
const ASSET = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";

describe("POST /api/library/tv/claim", () => {
  it("answers 200 with the remote's secret, never stored, once per code", () => {
    const tv = tvHarness();
    const { code } = tv.send("POST", "/api/tv/sessions").json;
    const claimed = tv.send("POST", "/api/library/tv/claim", { body: { code } });
    expect(claimed.status).toBe(200);
    expect(claimed.json["remoteSecret"]).toMatch(SECRET_PATTERN);
    expect(claimed.headers["cache-control"]).toBe("no-store");
    const again = tv.send("POST", "/api/library/tv/claim", { body: { code } });
    expect([again.status, again.json["error"]]).toEqual([404, "noSuchCode"]);
  });

  it("takes the code in any case", () => {
    const tv = tvHarness();
    const code = String(tv.send("POST", "/api/tv/sessions").json["code"]);
    const claimed = tv.send("POST", "/api/library/tv/claim", {
      body: { code: code.toLowerCase() },
    });
    expect(claimed.status).toBe(200);
  });

  it.each([
    ["three letters", { code: "ABC" }],
    ["a digit", { code: "AB1D" }],
    ["a number", { code: 1234 }],
    ["another key", { code: "ABCD", tv: "x" }],
    ["no object", ["ABCD"]],
  ])("refuses %s with 400 invalidCode", (_, body) => {
    const response = tvHarness().send("POST", "/api/library/tv/claim", { body });
    expect([response.status, response.json["error"]]).toEqual([400, "invalidCode"]);
  });

  it("refuses a body that is not application/json with 415 notJson", () => {
    const tv = tvHarness();
    const { code } = tv.send("POST", "/api/tv/sessions").json;
    const refused = tv.send("POST", "/api/library/tv/claim", {
      body: { code },
      headers: { "content-type": "text/plain" },
    });
    expect([refused.status, refused.json["error"]]).toEqual([415, "notJson"]);
    expect(tv.send("POST", "/api/library/tv/claim", { body: { code } }).status).toBe(200);
  });
});

describe("POST /api/library/tv/{remoteSecret}/show", () => {
  it("answers 204 and tells the TV to load the slideshow, which its key then serves", () => {
    const tv = tvHarness();
    const { tvKey, remoteSecret } = tv.claimedSession();
    const stream = tv.openStream(`/api/tv/${tvKey}/events`);
    const slideshowId = tv.createSlideshow();
    const shown = tv.send("POST", `/api/library/tv/${remoteSecret}/show`, {
      body: { slideshowId },
    });
    expect(shown.status).toBe(204);
    expect(stream.names()).toEqual(["snapshot", "show"]);
    const document = tv.send("GET", `/api/tv/${tvKey}/show`);
    expect([document.status, document.headers["cache-control"]]).toEqual([200, "no-store"]);
    expect(document.json["revision"]).toBe(1);
    expect(document.json["slideshow"]).toMatchObject({ title: "Generated" });
    expect(JSON.stringify(document.json)).not.toContain(slideshowId);
  });

  it.each([
    ["a slideshow that does not exist", "known", { slideshowId: "no-such" }, 404, "notFound"],
    ["a secret no session has", "unknown", "slideshow", 404, "noSuchTv"],
    ["a body without slideshowId", "known", { id: "x" }, 400, "invalidDocument"],
  ])("answers %s with %i %s", (_, secretKind, body, status, error) => {
    const tv = tvHarness();
    const { remoteSecret } = tv.claimedSession();
    const slideshowId = tv.createSlideshow();
    const secret = secretKind === "known" ? remoteSecret : UNKNOWN_KEY;
    const response = tv.send("POST", `/api/library/tv/${secret}/show`, {
      body: body === "slideshow" ? { slideshowId } : body,
    });
    expect([response.status, response.json["error"]]).toEqual([status, error]);
  });

  it("answers 409 boundToLink for a session bound to a share link", () => {
    const tv = tvHarness();
    const token = tv.shareSlideshow();
    const { remoteSecret } = tv.send("POST", `/api/share/${token}/tv`).json;
    const response = tv.send("POST", `/api/library/tv/${String(remoteSecret)}/show`, {
      body: { slideshowId: tv.createSlideshow() },
    });
    expect([response.status, response.json["error"]]).toEqual([409, "boundToLink"]);
  });
});

describe("the slideshow a way A TV shows", () => {
  /** A claimed session showing a slideshow with one picture and one song. */
  function showing() {
    const tv = tvHarness();
    const session = tv.claimedSession();
    const slideshowId = tv.createSlideshow();
    tv.send("POST", `/api/library/tv/${session.remoteSecret}/show`, { body: { slideshowId } });
    return { tv, ...session, slideshowId };
  }

  it("answers a song's bytes and a picture's Immich asset for Caddy", () => {
    const { tv, tvKey } = showing();
    const song = tv.send("GET", `/api/tv/${tvKey}/show/songs/0`);
    expect([song.status, song.headers["content-type"]]).toEqual([200, "audio/mp4"]);
    expect(song.body).toEqual(new Uint8Array([1, 2, 3]));
    const picture = tv.send("GET", `/internal/tv-picture/${tvKey}/0`);
    expect([picture.status, picture.headers["x-glissando-immich-asset"]]).toEqual([200, ASSET]);
  });

  it.each([
    ["a song it does not have", "/show/songs/1", 404, "noSuchSong"],
    ["a song position with a leading zero", "/show/songs/00", 404, "noSuchSong"],
  ])("answers %s with %i %s", (_, suffix, status, error) => {
    const { tv, tvKey } = showing();
    const response = tv.send("GET", `/api/tv/${tvKey}${suffix}`);
    expect([response.status, response.json["error"]]).toEqual([status, error]);
  });

  it("answers 404 noSuchPicture for a picture it does not have", () => {
    const { tv, tvKey } = showing();
    const response = tv.send("GET", `/internal/tv-picture/${tvKey}/1`);
    expect([response.status, response.json["error"]]).toEqual([404, "noSuchPicture"]);
  });

  it.each([
    ["the document", (key: string) => `/api/tv/${key}/show`],
    ["a song", (key: string) => `/api/tv/${key}/show/songs/0`],
    ["a picture", (key: string) => `/internal/tv-picture/${key}/0`],
  ])("answers 404 notShown for %s until a slideshow is chosen", (_, path) => {
    const tv = tvHarness();
    const { tvKey } = tv.claimedSession();
    const response = tv.send("GET", path(tvKey));
    expect([response.status, response.json["error"]]).toEqual([404, "notShown"]);
  });

  it("answers 404 notShown once the chosen slideshow is deleted", () => {
    const { tv, tvKey, slideshowId } = showing();
    expect(tv.send("GET", `/api/tv/${tvKey}/show`).status).toBe(200);
    tv.library.send("DELETE", `/api/library/slideshows/${slideshowId}`);
    expect(tv.send("GET", `/api/tv/${tvKey}/show`).json["error"]).toBe("notShown");
  });

  it("answers 404 noSuchTv for a key no session has", () => {
    const response = tvHarness().send("GET", `/api/tv/${UNKNOWN_KEY}/show`);
    expect([response.status, response.json["error"]]).toEqual([404, "noSuchTv"]);
  });

  it("serves no slideshow to a way B session's key", () => {
    const tv = tvHarness();
    const token = tv.shareSlideshow();
    const { tvKey } = tv.send("POST", `/api/share/${token}/tv`).json;
    expect(tv.library.send("GET", `/api/share/${token}`).status).toBe(200);
    const response = tv.send("GET", `/api/tv/${String(tvKey)}/show`);
    expect([response.status, response.json["error"]]).toEqual([404, "notShown"]);
  });
});
