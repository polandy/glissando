import { describe, expect, it } from "vitest";
import { tvHarness } from "./testing/tv-routes-harness";
import { playingState } from "./testing/tv-hub-harness";
import { isTvPath } from "./tv-routes";

const KEY_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const UNKNOWN_KEY = "AAAAAAAAAAAAAAAAAAAAAA";

describe("making a session", () => {
  it("POST /api/tv/sessions answers 201 with a key and a code, never stored", () => {
    const response = tvHarness().send("POST", "/api/tv/sessions");
    expect(response.status).toBe(201);
    expect(response.json["tvKey"]).toMatch(KEY_PATTERN);
    expect(response.json["code"]).toMatch(/^[A-Z]{4}$/);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("POST /api/share/{token}/tv answers 201 with a key and the remote's secret", () => {
    const tv = tvHarness();
    const response = tv.send("POST", `/api/share/${tv.shareSlideshow()}/tv`);
    expect(response.status).toBe(201);
    expect(response.json["tvKey"]).toMatch(KEY_PATTERN);
    expect(response.json["remoteSecret"]).toMatch(KEY_PATTERN);
  });

  it("POST /api/share/{token}/tv answers 404 notShared for a token nothing is shared by", () => {
    const response = tvHarness().send("POST", `/api/share/${UNKNOWN_KEY}/tv`);
    expect([response.status, response.json["error"]]).toEqual([404, "notShared"]);
  });

  it("refuses a body that is not application/json with 415 notJson", () => {
    const response = tvHarness().send("POST", "/api/tv/sessions", {
      headers: { "content-type": "text/plain" },
    });
    expect([response.status, response.json["error"]]).toEqual([415, "notJson"]);
  });
});

describe("the streams", () => {
  it("open with the event-stream headers and a snapshot", () => {
    const tv = tvHarness();
    const { tvKey, remoteSecret } = tv.claimedSession();
    const tvStream = tv.openStream(`/api/tv/${tvKey}/events`);
    const remote = tv.openStream(`/api/tv/remote/${remoteSecret}/events`);
    expect(tvStream.response.headers["content-type"]).toBe("text/event-stream");
    expect(tvStream.events[0]).toEqual({
      name: "snapshot",
      data: { claimed: true, showing: false, remotePresent: false },
    });
    expect(remote.events).toEqual([{ name: "snapshot", data: { tvPresent: true, state: null } }]);
  });

  it.each([
    ["the TV's", `/api/tv/${UNKNOWN_KEY}/events`],
    ["the remote's", `/api/tv/remote/${UNKNOWN_KEY}/events`],
  ])("answer 404 noSuchTv for %s stream of no session", (_, path) => {
    const response = tvHarness().send("GET", path);
    expect([response.status, response.json["error"]]).toEqual([404, "noSuchTv"]);
  });

  it("end at once when the session ended between the answer and its opening", () => {
    const tv = tvHarness();
    const { tvKey, remoteSecret } = tv.claimedSession();
    const answer = tv.answer("GET", `/api/tv/${tvKey}/events`);
    tv.send("POST", `/api/tv/remote/${remoteSecret}/command`, { body: { type: "disconnect" } });
    const events: string[] = [];
    let closed = false;
    if (!("open" in answer)) throw new Error("no stream");
    answer.open({ send: (event) => events.push(event.name), close: () => (closed = true) });
    expect([events, closed]).toEqual([["end"], true]);
  });
});

describe("state reports and commands", () => {
  it("PUT state answers 204 and passes the state to the remote", () => {
    const tv = tvHarness();
    const { tvKey, remoteSecret } = tv.claimedSession();
    const remote = tv.openStream(`/api/tv/remote/${remoteSecret}/events`);
    const response = tv.send("PUT", `/api/tv/${tvKey}/state`, { body: playingState });
    expect(response.status).toBe(204);
    expect(remote.events.at(-1)).toEqual({ name: "state", data: playingState });
  });

  it.each([
    ["a volume over 1", { ...playingState, volume: 1.5 }],
    ["a missing field", { ...playingState, title: undefined }],
    ["an unknown field", { ...playingState, muted: true }],
  ])("PUT state refuses %s with 400 invalidState", (_, body) => {
    const tv = tvHarness();
    const { tvKey } = tv.claimedSession();
    const response = tv.send("PUT", `/api/tv/${tvKey}/state`, { body });
    expect([response.status, response.json["error"]]).toEqual([400, "invalidState"]);
  });

  it("PUT state answers 404 noSuchTv for a key no session has", () => {
    const response = tvHarness().send("PUT", `/api/tv/${UNKNOWN_KEY}/state`, {
      body: playingState,
    });
    expect([response.status, response.json["error"]]).toEqual([404, "noSuchTv"]);
  });

  it("a command answers 204 and reaches the TV's stream", () => {
    const tv = tvHarness();
    const { tvKey, remoteSecret } = tv.claimedSession();
    const tvStream = tv.openStream(`/api/tv/${tvKey}/events`);
    const response = tv.send("POST", `/api/tv/remote/${remoteSecret}/command`, {
      body: { type: "seek", value: 30 },
    });
    expect(response.status).toBe(204);
    expect(tvStream.events.at(-1)).toEqual({ name: "command", data: { type: "seek", value: 30 } });
  });

  it.each([
    ["no TV stream is open", "known", { type: "play" }, 409, "tvAway"],
    ["an unknown command", "known", { type: "rewind" }, 400, "invalidCommand"],
    ["a value on play", "known", { type: "play", value: 1 }, 400, "invalidCommand"],
    ["a secret no session has", "unknown", { type: "play" }, 404, "noSuchTv"],
  ])("a command answers %s with %i %s", (_, secretKind, body, status, error) => {
    const tv = tvHarness();
    const { remoteSecret } = tv.claimedSession();
    const secret = secretKind === "known" ? remoteSecret : UNKNOWN_KEY;
    const response = tv.send("POST", `/api/tv/remote/${secret}/command`, { body });
    expect([response.status, response.json["error"]]).toEqual([status, error]);
  });

  it("disconnect ends both streams and the session", () => {
    const tv = tvHarness();
    const { tvKey, remoteSecret } = tv.claimedSession();
    const tvStream = tv.openStream(`/api/tv/${tvKey}/events`);
    const remote = tv.openStream(`/api/tv/remote/${remoteSecret}/events`);
    const path = `/api/tv/remote/${remoteSecret}/command`;
    expect(tv.send("POST", path, { body: { type: "disconnect" } }).status).toBe(204);
    expect([tvStream.names().at(-1), remote.names().at(-1)]).toEqual(["end", "end"]);
    expect(tv.send("POST", path, { body: { type: "play" } }).json["error"]).toBe("noSuchTv");
  });
});

describe("routing and logs", () => {
  it.each([
    ["GET", "/api/tv/sessions"],
    ["PUT", "/api/library/tv/claim"],
    ["POST", "/api/tv/KEY/events"],
    ["GET", "/api/tv/KEY/state"],
    ["GET", "/api/tv/KEY/show/0/pictures/0"],
    ["GET", "/api/tv/KEY/events/extra"],
    ["GET", "/api/tv/remote/KEY/command"],
    ["GET", "/api/tv/remote/KEY/unknown"],
    ["GET", "/internal/tv-picture/KEY"],
    ["toString", "/api/tv/sessions"],
  ])("answers %s %s with 404 notFound", (method, path) => {
    const response = tvHarness().send(method, path);
    expect([response.status, response.json["error"]]).toEqual([404, "notFound"]);
  });

  it("logs every request without its key, secret, code or share token", () => {
    const tv = tvHarness();
    const token = tv.shareSlideshow();
    tv.send("POST", `/api/share/${token}/tv`);
    const { tvKey, code, remoteSecret } = tv.claimedSession();
    tv.openStream(`/api/tv/${tvKey}/events`);
    tv.send("POST", `/api/tv/remote/${remoteSecret}/command`, { body: { type: "play" } });
    expect(tv.logged).toEqual([
      "POST /api/share/…/tv 201",
      "POST /api/tv/sessions 201",
      "POST /api/library/tv/claim 200",
      "GET /api/tv/…/events 200",
      "POST /api/tv/remote/…/command 204",
    ]);
    const all = tv.logged.join("\n");
    for (const secret of [token, tvKey, code, remoteSecret]) expect(all).not.toContain(secret);
  });

  it.each([
    ["/api/tv/sessions", true],
    ["/api/library/tv/claim", true],
    ["/internal/tv-picture/KEY/0", true],
    ["/api/share/TOKEN/tv", true],
    ["/api/share/TOKEN", false],
    ["/api/share/TOKEN/tv/extra", false],
    ["/api/library/slideshows", false],
    ["/api/tvs", false],
  ])("counts %s as a TV path: %s", (path, expected) => {
    expect(isTvPath(path)).toBe(expected);
  });
});
