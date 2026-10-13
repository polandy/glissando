import { describe, expect, it } from "vitest";
import type { PlaybackState } from "../tv-remote/tv-protocol";
import type { RemoteStreamEvent } from "./remote-model";
import {
  createRemoteApi,
  EVENT_SOURCE_CLOSED,
  EVENT_SOURCE_CONNECTING,
  RECONNECT_DELAY_MS,
  RemoteStreamFormatError,
} from "./remote-stream";
import { FakeEventSource } from "./testing/fake-event-source";

const SECRET = "AbCdEfGhIjKlMnOpQrStUv";
const state: PlaybackState = {
  playing: true,
  ended: false,
  needsTvOk: false,
  positionSeconds: 12.5,
  durationSeconds: 200,
  pictureIndex: 2,
  pictureCount: 48,
  volume: 0.7,
  title: "July 2025",
};

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

/** The remote API over fakes: each `fetch` takes the next answer, `schedule` holds its runs. */
function remote(answers: (() => Promise<Response>)[] = []) {
  const sources: FakeEventSource[] = [];
  const calls: FetchCall[] = [];
  const scheduled: { run: () => Promise<void>; delayMs: number }[] = [];
  const errors: unknown[] = [];
  const events: RemoteStreamEvent[] = [];
  const api = createRemoteApi(SECRET, {
    openEventSource: (url) => {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    },
    fetch: (url, init) => {
      calls.push({ url, init });
      const answer = answers.shift();
      if (answer === undefined) throw new Error(`no answer for ${url}`);
      return answer();
    },
    schedule: (run, delayMs) => scheduled.push({ run, delayMs }),
    reportError: (error) => errors.push(error),
  });
  return { api, sources, calls, scheduled, errors, events };
}

const json = (status: number, body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const noContent = () => Promise.resolve(new Response(null, { status: 204 }));

describe("the remote stream", () => {
  function opened() {
    const fake = remote();
    fake.api.openStream((event) => fake.events.push(event));
    const source = fake.sources[0];
    if (source === undefined) throw new Error("no stream opened");
    return { ...fake, source };
  }

  it("opens the remote's own stream", () => {
    expect(opened().source.url).toBe(`/api/tv/remote/${SECRET}/events`);
  });

  it.each<[string, string, unknown, RemoteStreamEvent]>([
    [
      "snapshot",
      "snapshot",
      { tvPresent: true, state },
      { type: "snapshot", tvPresent: true, state },
    ],
    [
      "snapshot before anything shows",
      "snapshot",
      { tvPresent: false, state: null },
      { type: "snapshot", tvPresent: false, state: null },
    ],
    ["state", "state", state, { type: "state", state }],
    ["tv", "tv", { present: false }, { type: "tv", present: false }],
    ["end", "end", {}, { type: "end" }],
  ])("reads a %s event", (_name, type, data, expected) => {
    const { source, events } = opened();
    source.send(type, JSON.stringify(data));
    expect(events).toEqual([expected]);
  });

  it("closes the stream at its end, so the browser does not reconnect", () => {
    const { source } = opened();
    source.send("end", "{}");
    expect(source.closed).toBe(true);
  });

  it.each([
    ["no JSON", "snapshot", "{"],
    ["a key it does not know", "tv", JSON.stringify({ present: true, extra: 1 })],
    ["a bad state", "state", JSON.stringify({ ...state, volume: 2 })],
    ["a snapshot without its state", "snapshot", JSON.stringify({ tvPresent: true })],
  ])("reports an event with %s as an error and passes nothing on", (_name, type, data) => {
    const { source, events, errors } = opened();
    source.send("tv", JSON.stringify({ present: true }));
    source.send(type, data);
    expect(events).toEqual([{ type: "tv", present: true }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(RemoteStreamFormatError);
  });

  it("tells the loss while the browser reconnects by itself", () => {
    const { source, events, sources, scheduled } = opened();
    source.fail(EVENT_SOURCE_CONNECTING);
    expect(events).toEqual([{ type: "lost" }]);
    expect(sources).toHaveLength(1);
    expect(scheduled).toEqual([]);
  });
});

describe("the remote stream the browser gave up on", () => {
  async function givenUp(probes: (() => Promise<Response>)[]) {
    const fake = remote(probes);
    fake.api.openStream((event) => fake.events.push(event));
    fake.sources[0]?.fail(EVENT_SOURCE_CLOSED);
    expect(fake.events).toEqual([{ type: "lost" }]);
    expect(fake.scheduled.map(({ delayMs }) => delayMs)).toEqual([RECONNECT_DELAY_MS]);
    await runScheduled(fake.scheduled);
    return fake;
  }

  async function runScheduled(scheduled: { run: () => Promise<void> }[]) {
    const next = scheduled.shift();
    if (next === undefined) throw new Error("nothing scheduled");
    await next.run();
  }

  it("ends when the session is gone (404 noSuchTv)", async () => {
    const { events, sources, calls } = await givenUp([
      json(404, { error: "noSuchTv", detail: "" }),
    ]);
    expect(calls[0]?.url).toBe(`/api/tv/remote/${SECRET}/events`);
    expect(events).toEqual([{ type: "lost" }, { type: "end" }]);
    expect(sources).toHaveLength(1);
  });

  it("opens the stream again once the server answers, and drops the probe", async () => {
    const { sources, calls } = await givenUp([
      () => Promise.resolve(new Response("", { status: 200 })),
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[0]?.closed).toBe(true);
    expect(calls[0]?.init?.signal?.aborted).toBe(true);
  });

  it("tries again later while the server does not answer", async () => {
    const { sources, scheduled, events } = await givenUp([() => Promise.reject(new TypeError())]);
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([RECONNECT_DELAY_MS]);
    expect(sources).toHaveLength(1);
    expect(events).toEqual([{ type: "lost" }]);
  });

  it("tries again later after a server error", async () => {
    const { scheduled, events } = await givenUp([json(502, {})]);
    expect(scheduled).toHaveLength(1);
    expect(events).toEqual([{ type: "lost" }]);
  });
});

describe("a command", () => {
  it("is POSTed as JSON to the remote's command route", async () => {
    const { api, calls } = remote([noContent]);
    expect(await api.send({ type: "seek", value: 42 })).toBeNull();
    expect(calls).toEqual([
      {
        url: `/api/tv/remote/${SECRET}/command`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "seek", value: 42 }),
        },
      },
    ]);
  });

  it.each<[string, () => Promise<Response>, string]>([
    ["no TV stream is open (409 tvAway)", json(409, { error: "tvAway", detail: "" }), "tvAway"],
    ["the session ended (404 noSuchTv)", json(404, { error: "noSuchTv", detail: "" }), "ended"],
    ["the service refused it", json(400, { error: "invalidCommand", detail: "" }), "failed"],
    ["the server is down", json(502, {}), "failed"],
    ["any other 404", () => Promise.resolve(new Response("", { status: 404 })), "failed"],
    ["the network failed", () => Promise.reject(new TypeError("offline")), "failed"],
  ])("fails as %s", async (_name, answer, failure) => {
    const { api } = remote([answer]);
    expect(await api.send({ type: "pause" })).toBe(failure);
  });

  it("reports why an unexpected failure happened", async () => {
    const { api, errors } = remote([json(400, { error: "invalidCommand", detail: "" })]);
    await api.send({ type: "pause" });
    expect(errors).toHaveLength(1);
  });
});
