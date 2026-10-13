import { describe, expect, it } from "vitest";
import { DocumentFormatError } from "../glissando-file/document-values";
import {
  createTvApi,
  EVENT_SOURCE_CLOSED,
  openTvStream,
  TvAnswerError,
  TvGoneError,
  tvShowPath,
  TvUnreachableError,
  type EventSourcePort,
  type TvEvent,
  type TvFetchPort,
} from "./tv-api";
import type { PlaybackState } from "./tv-protocol";

const TV_KEY = "TvKeyTvKeyTvKeyTvKey12";
const SECRET = "RemoteRemoteRemoteRe34";

interface Asked {
  readonly url: string;
  readonly method: string;
  readonly contentType: string | undefined;
  readonly body: unknown;
}

/** Answers every request with `answer`, and notes what was asked. */
function fakeFetch(answer: () => Response | Promise<Response>) {
  const asked: Asked[] = [];
  const fetch: TvFetchPort = (url, init) => {
    asked.push({
      url,
      method: init.method,
      contentType: init.headers["Content-Type"],
      body: JSON.parse(init.body),
    });
    return Promise.resolve(answer());
  };
  return { fetch, asked };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const STATE: PlaybackState = {
  playing: true,
  ended: false,
  needsTvOk: false,
  positionSeconds: 3,
  durationSeconds: 40,
  pictureIndex: 0,
  pictureCount: 4,
  volume: 1,
  title: "Generated",
};

describe("the TV API", () => {
  it("makes a session for the TV page at /tv, with its code", async () => {
    const { fetch, asked } = fakeFetch(() => json(201, { tvKey: TV_KEY, code: "KQMT" }));

    const session = await createTvApi(fetch).createSession();

    expect(session).toEqual({ tvKey: TV_KEY, code: "KQMT" });
    expect(asked).toEqual([
      { url: "/api/tv/sessions", method: "POST", contentType: "application/json", body: {} },
    ]);
  });

  it("makes a session bound to a share link, its token escaped", async () => {
    const { fetch, asked } = fakeFetch(() => json(201, { tvKey: TV_KEY, remoteSecret: SECRET }));

    const session = await createTvApi(fetch).createLinkedSession("a/b");

    expect(session).toEqual({ tvKey: TV_KEY, remoteSecret: SECRET });
    expect(asked.map(({ url, method }) => `${method} ${url}`)).toEqual([
      "POST /api/share/a%2Fb/tv",
    ]);
  });

  it("puts the playback state", async () => {
    const { fetch, asked } = fakeFetch(() => new Response(null, { status: 204 }));

    await createTvApi(fetch).report(TV_KEY, STATE);

    expect(asked).toEqual([
      {
        url: `/api/tv/${TV_KEY}/state`,
        method: "PUT",
        contentType: "application/json",
        body: STATE,
      },
    ]);
  });

  it.each([
    { what: "noSuchTv", response: () => json(404, { error: "noSuchTv", detail: "" }) },
    { what: "notShared", response: () => json(404, { error: "notShared", detail: "" }) },
  ])("reports the session or link gone on a 404 $what", async ({ response }) => {
    const api = createTvApi(fakeFetch(response).fetch);

    await expect(api.report(TV_KEY, STATE)).rejects.toThrow(TvGoneError);
    await expect(api.createLinkedSession("token")).rejects.toThrow(TvGoneError);
  });

  it.each([
    { what: "a 502 from the proxy", response: () => new Response("", { status: 502 }) },
    { what: "no network", response: () => Promise.reject(new TypeError("Failed to fetch")) },
  ])("reports the server unreachable on $what", async ({ response }) => {
    const api = createTvApi(fakeFetch(response).fetch);

    await expect(api.createSession()).rejects.toThrow(TvUnreachableError);
  });

  it.each([
    { what: "a 400", response: () => json(400, { error: "invalidState", detail: "" }) },
    { what: "an answer without the key", response: () => json(201, { code: "KQMT" }) },
    { what: "a sign-in page", response: () => new Response("<!doctype html>", { status: 200 }) },
  ])("fails loud on $what", async ({ response }) => {
    const api = createTvApi(fakeFetch(response).fetch);

    await expect(api.createSession()).rejects.toThrow(TvAnswerError);
  });

  it("names where the TV's chosen slideshow is read from", () => {
    expect(tvShowPath(TV_KEY)).toBe(`/api/tv/${TV_KEY}/show`);
  });
});

class FakeEventSource extends EventTarget implements EventSourcePort {
  readyState = 1;
  closed = false;
  constructor(readonly url: string) {
    super();
  }
  send(name: string, data: unknown): void {
    this.dispatchEvent(new MessageEvent(name, { data: JSON.stringify(data) }));
  }
  fail(readyState: number): void {
    this.readyState = readyState;
    this.dispatchEvent(new Event("error"));
  }
  close(): void {
    this.closed = true;
  }
}

function streamed() {
  const sources: FakeEventSource[] = [];
  const events: TvEvent[] = [];
  const faults: unknown[] = [];
  const close = openTvStream(
    (url) => {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    },
    TV_KEY,
    { event: (event) => events.push(event), fault: (error) => faults.push(error) },
  );
  const [source] = sources;
  if (source === undefined) throw new Error("the stream opened no event source");
  return { source, events, faults, close };
}

describe("the TV's stream", () => {
  it("opens the TV's events and reads each event", () => {
    const { source, events } = streamed();

    source.send("snapshot", { claimed: false, showing: false, remotePresent: true });
    source.send("claimed", {});
    source.send("show", {});
    source.send("command", { type: "seek", value: 12 });
    source.send("remote", { present: false });
    source.send("end", {});

    expect(source.url).toBe(`/api/tv/${TV_KEY}/events`);
    expect(events).toEqual([
      { type: "snapshot", claimed: false, showing: false, remotePresent: true },
      { type: "claimed" },
      { type: "show" },
      { type: "command", command: { type: "seek", value: 12 } },
      { type: "remote", present: false },
      { type: "end" },
    ]);
  });

  it("tells the stream lost for good once the browser stopped reconnecting, and closes it", () => {
    const { source, events } = streamed();

    source.fail(0);
    expect(events).toEqual([]);
    source.fail(EVENT_SOURCE_CLOSED);

    expect(events).toEqual([{ type: "lost" }]);
    expect(source.closed).toBe(true);
  });

  it.each([
    ["a command it does not know", "command", { type: "rewind" }],
    ["a snapshot without a flag", "snapshot", { claimed: false, showing: false }],
    ["a remote event whose presence is no flag", "remote", { present: "yes" }],
  ])("hands %s on as a fault, not as an event", (_name, event, data) => {
    const { source, events, faults } = streamed();

    source.send(event, data);

    expect(faults).toEqual([expect.any(DocumentFormatError)]);
    expect(events).toEqual([]);
  });

  it("closes the event source on close", () => {
    const { source, close } = streamed();

    close();

    expect(source.closed).toBe(true);
  });
});
