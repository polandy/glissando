import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
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

describe("serve", () => {
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
