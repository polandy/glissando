import { describe, expect, it } from "vitest";
import {
  KEEP_ALIVE_MS,
  pipeEventStream,
  streamAnswer,
  type StreamEvent,
  type StreamResponse,
} from "./event-stream";
import type { EventSink } from "./tv-hub";

/** A response that records what was written, and a repeat the test fires by hand. */
function edge() {
  const written: string[] = [];
  const heads: [number, Record<string, string>][] = [];
  const closeListeners: (() => void)[] = [];
  let ended = false;
  const response: StreamResponse = {
    writeHead: (status, headers) => heads.push([status, { ...headers }]),
    write: (chunk) => written.push(chunk),
    end: () => {
      ended = true;
    },
    once: (_, listener) => closeListeners.push(listener),
  };
  const repeats: { everyMs: number; action: () => void; cancelled: boolean }[] = [];
  const repeat = (everyMs: number, action: () => void) => {
    const entry = { everyMs, action, cancelled: false };
    repeats.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };
  return {
    response,
    repeat,
    written,
    heads,
    repeats,
    isEnded: () => ended,
    clientLeaves: () => closeListeners.forEach((listener) => listener()),
  };
}

/** An answer whose stream the test drives through the sink it was opened with. */
function drivenAnswer() {
  const opened: EventSink<StreamEvent>[] = [];
  let closedByClient = 0;
  const answer = streamAnswer((sink) => {
    opened.push(sink);
    return () => closedByClient++;
  });
  return { answer, opened, closedByClient: () => closedByClient };
}

describe("an event stream on the HTTP response", () => {
  it("answers 200 text/event-stream, never stored nor buffered by a proxy", () => {
    const { response, repeat, heads } = edge();
    pipeEventStream(drivenAnswer().answer, response, repeat);
    expect(heads).toEqual([
      [
        200,
        {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
          "x-accel-buffering": "no",
        },
      ],
    ]);
  });

  it("writes each event as its name and its JSON", () => {
    const { response, repeat, written } = edge();
    const { answer, opened } = drivenAnswer();
    pipeEventStream(answer, response, repeat);
    opened[0]?.send({ name: "remote", data: { present: true } });
    expect(written).toEqual(['event: remote\ndata: {"present":true}\n\n']);
  });

  it("writes a keep-alive comment every KEEP_ALIVE_MS, 25 s", () => {
    const { response, repeat, written, repeats } = edge();
    pipeEventStream(drivenAnswer().answer, response, repeat);
    expect(repeats.map((entry) => entry.everyMs)).toEqual([KEEP_ALIVE_MS]);
    expect(KEEP_ALIVE_MS).toBe(25_000);
    repeats[0]?.action();
    expect(written).toEqual([": keep-alive\n\n"]);
  });

  it("tells the stream's owner and stops the keep-alive when the client leaves", () => {
    const { response, repeat, repeats, clientLeaves } = edge();
    const { answer, closedByClient } = drivenAnswer();
    pipeEventStream(answer, response, repeat);
    expect(closedByClient()).toBe(0);
    clientLeaves();
    expect([closedByClient(), repeats[0]?.cancelled]).toEqual([1, true]);
  });

  it("ends the response when the owner closes the stream, writing nothing after", () => {
    const { response, repeat, written, repeats, isEnded } = edge();
    const { answer, opened } = drivenAnswer();
    pipeEventStream(answer, response, repeat);
    opened[0]?.send({ name: "end", data: {} });
    opened[0]?.close();
    opened[0]?.send({ name: "state", data: {} });
    expect([isEnded(), repeats[0]?.cancelled]).toEqual([true, true]);
    expect(written).toEqual(["event: end\ndata: {}\n\n"]);
  });

  it("ends the response when the edge ends it, as at shutdown", () => {
    const { response, repeat, repeats, isEnded } = edge();
    const end = pipeEventStream(drivenAnswer().answer, response, repeat);
    expect(isEnded()).toBe(false);
    end();
    expect([isEnded(), repeats[0]?.cancelled]).toEqual([true, true]);
  });
});
