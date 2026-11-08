import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { DRAIN_BUDGET_BYTES } from "./collect-body";
import { MAX_FOCUS_BYTES, type LibraryRequest } from "./library-http";
import { serve, type Handlers } from "./serve";
import { streamAnswer } from "./tv/event-stream";

const TV_PATH = "/api/tv/sessions";

function request(path: string): IncomingMessage {
  return Object.assign((async function* () {})(), {
    method: "GET",
    url: path,
    headers: {},
  }) as unknown as IncomingMessage;
}

/** A response whose `writeHead` throws, recording what the server did to the connection. */
function brokenResponse() {
  const seen = { destroyed: 0, ended: 0 };
  const response = {
    destroyed: false,
    writeHead: () => {
      throw new Error("headers already sent");
    },
    end: () => (seen.ended += 1),
    destroy: () => (seen.destroyed += 1),
    once: () => response,
  };
  return { response: response as unknown as ServerResponse, seen };
}

function handlers(answer: ReturnType<Handlers["tv"]>): Handlers {
  const answerWith = () => answer;
  return { library: answerWith as Handlers["library"], tv: answerWith, openStreams: new Set() };
}

async function serveBroken(answer: ReturnType<Handlers["tv"]>) {
  const lines: string[] = [];
  const { response, seen } = brokenResponse();
  const dependencies = {
    repeatEvery: () => () => {},
    logError: (line: string) => lines.push(line),
  };
  await serve(handlers(answer), dependencies, request(TV_PATH), response);
  return { lines, seen };
}

const FOCUS_PATH = "/api/library/slideshows/s1/focus/a1";

/** A PUT whose body runs past the focus limit and the drain budget, recording `destroy`. */
function oversizedRequest() {
  const seen = { destroyed: 0 };
  async function* body() {
    yield new Uint8Array(MAX_FOCUS_BYTES + DRAIN_BUDGET_BYTES + 1);
    yield new Uint8Array(1);
  }
  const request = Object.assign(body(), {
    method: "PUT",
    url: FOCUS_PATH,
    headers: {},
    destroy: () => (seen.destroyed += 1),
  }) as unknown as IncomingMessage;
  return { request, seen };
}

/** A response recording its head and whether the socket was destroyed before it ended. */
function recordingResponse(request: { seen: { destroyed: number } }) {
  const written: { status?: number; headers?: Record<string, string>; destroyedAtEnd?: number } =
    {};
  const response = {
    writeHead: (status: number, headers: Record<string, string>) => {
      written.status = status;
      written.headers = headers;
    },
    end: (_body: string, finished: () => void) => {
      written.destroyedAtEnd = request.seen.destroyed;
      finished();
    },
  };
  return { response: response as unknown as ServerResponse, written };
}

describe("serve", () => {
  it("answers a body past the drain budget with 413, then destroys the socket", async () => {
    const oversized = oversizedRequest();
    const { response, written } = recordingResponse(oversized);
    const bodies: LibraryRequest["body"][] = [];
    const library = (request: LibraryRequest) => {
      bodies.push(request.body);
      return { status: 413, headers: {}, body: "" };
    };
    const all: Handlers = { library, tv: library, openStreams: new Set() };
    const dependencies = { repeatEvery: () => () => {}, logError: () => {} };

    await serve(all, dependencies, oversized.request, response);

    expect(bodies).toEqual([{ kind: "tooLarge" }]);
    expect(written.status).toBe(413);
    expect(written.headers).toEqual({ connection: "close" });
    expect(written.destroyedAtEnd).toBe(0);
    expect(oversized.seen.destroyed).toBe(1);
  });

  it("logs a plain answer that cannot be written and closes the socket", async () => {
    const { lines, seen } = await serveBroken({ status: 200, headers: {}, body: "" });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`GET ${TV_PATH} failed`);
    expect(lines[0]).toContain("headers already sent");
    expect(seen.destroyed).toBe(1);
  });

  it("logs an event stream that cannot be opened and closes the socket", async () => {
    const { lines, seen } = await serveBroken(streamAnswer(() => () => {}));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("headers already sent");
    expect(seen.destroyed).toBe(1);
  });
});
