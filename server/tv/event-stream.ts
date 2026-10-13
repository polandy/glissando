import { HTTP_STATUS } from "../library-http";
import type { CloseStream, EventSink } from "./tv-hub";

/**
 * A TV or remote stream as a plain value the routes answer, and its mapping onto a
 * `text/event-stream` response at the edge (dev-docs/tv_remote/HTTP_API.md, Streams).
 */

/** Below the idle timeouts of common proxies, so they keep a quiet stream open. */
export const KEEP_ALIVE_MS = 25_000;
const KEEP_ALIVE_COMMENT = ": keep-alive\n\n";

const STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-store",
  // nginx-style proxies buffer a response unless told not to.
  "x-accel-buffering": "no",
} as const;

export interface StreamEvent {
  readonly name: string;
  readonly data: unknown;
}

export interface StreamAnswer {
  readonly kind: "stream";
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  /** Starts the stream on `sink`; the answer is called once the client has gone. */
  readonly open: (sink: EventSink<StreamEvent>) => CloseStream;
}

export function streamAnswer(open: StreamAnswer["open"]): StreamAnswer {
  return { kind: "stream", status: HTTP_STATUS.ok, headers: STREAM_HEADERS, open };
}

/** The part of node's `ServerResponse` a stream needs. */
export interface StreamResponse {
  writeHead(status: number, headers: Readonly<Record<string, string>>): unknown;
  write(chunk: string): unknown;
  end(): unknown;
  once(event: "close", listener: () => void): unknown;
}

/** Calls `action` every `everyMs` until the answer is called. */
export type Repeat = (everyMs: number, action: () => void) => () => void;

/** Writes `answer`'s stream to `response`; answers how to end it, as at shutdown. */
export function pipeEventStream(
  answer: StreamAnswer,
  response: StreamResponse,
  repeat: Repeat,
): () => void {
  let ended = false;
  response.writeHead(answer.status, answer.headers);
  const write = (chunk: string) => {
    if (!ended) response.write(chunk);
  };
  const stopKeepAlive = repeat(KEEP_ALIVE_MS, () => write(KEEP_ALIVE_COMMENT));
  const end = () => {
    if (ended) return;
    ended = true;
    stopKeepAlive();
    response.end();
  };
  const closeStream = answer.open({
    send: ({ name, data }) => write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`),
    close: end,
  });
  response.once("close", () => {
    ended = true;
    stopKeepAlive();
    closeStream();
  });
  return end;
}
