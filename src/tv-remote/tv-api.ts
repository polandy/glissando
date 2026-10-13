import {
  DocumentFormatError,
  readObject,
  readText,
  type JsonObject,
} from "../glissando-file/document-values";
import { readCommand, type Command, type PlaybackState } from "./tv-protocol";

/**
 * The TV page's side of the public TV routes (dev-docs/tv_remote/HTTP_API.md, Public), its
 * failures as typed errors. The chosen slideshow itself is read as a share link is, at
 * `tvShowPath` (`createShowApi`).
 */

/** `fetch` as the TV page uses it: a JSON write to its own origin. */
export type TvFetchPort = (
  url: string,
  init: {
    readonly method: "POST" | "PUT";
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
  },
) => Promise<Response>;

export interface TvApi {
  /** Way A: a session for this TV, with the code the phone claims it by. */
  createSession(): Promise<{ readonly tvKey: string; readonly code: string }>;
  /** Way B: a session bound to the share link `token`, with the remote's secret. */
  createLinkedSession(
    token: string,
  ): Promise<{ readonly tvKey: string; readonly remoteSecret: string }>;
  report(tvKey: string, state: PlaybackState): Promise<void>;
}

/** The session or the share link is gone (404 `noSuchTv`, `notShared`). */
export class TvGoneError extends Error {
  override readonly name = "TvGoneError";
}

/** The server isn't answering: no network, or a 5xx from the service or a proxy. */
export class TvUnreachableError extends Error {
  override readonly name = "TvUnreachableError";
}

/** The service's answer to anything else. */
export class TvAnswerError extends Error {
  override readonly name = "TvAnswerError";
}

const TV_API_PATH = "/api/tv/";
const SHARE_API_PATH = "/api/share/";
const NOT_FOUND = 404;
const FIRST_SERVER_ERROR = 500;
const JSON_HEADERS = { "Content-Type": "application/json" };

const tvPath = (tvKey: string) => `${TV_API_PATH}${encodeURIComponent(tvKey)}`;

/** Where the TV's chosen slideshow answers as a share link does (way A). */
export function tvShowPath(tvKey: string): string {
  return `${tvPath(tvKey)}/show`;
}

export function createTvApi(fetch: TvFetchPort): TvApi {
  const send = async (method: "POST" | "PUT", url: string, body: unknown): Promise<Response> => {
    let response: Response;
    try {
      response = await fetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify(body) });
    } catch (cause: unknown) {
      throw new TvUnreachableError(`${method} ${url} could not be sent`, { cause });
    }
    if (response.ok) return response;
    if (response.status >= FIRST_SERVER_ERROR) {
      throw new TvUnreachableError(`${method} ${url} answered ${response.status}`);
    }
    if (response.status === NOT_FOUND) throw new TvGoneError(`${method} ${url} answered 404`);
    throw new TvAnswerError(`${method} ${url} answered ${response.status}, expected 2xx or 404`);
  };
  const created = async <Key extends string>(
    url: string,
    keys: readonly Key[],
  ): Promise<Record<Key, string>> => {
    const response = await send("POST", url, {});
    try {
      const root = readObject(JSON.parse(await response.text()), "", keys);
      return Object.fromEntries(keys.map((key) => [key, readText(root[key], key)])) as Record<
        Key,
        string
      >;
    } catch (cause: unknown) {
      throw new TvAnswerError(`POST ${url} answered no new session`, { cause });
    }
  };
  return {
    createSession: () => created(`${TV_API_PATH}sessions`, ["tvKey", "code"]),
    createLinkedSession: (token) =>
      created(`${SHARE_API_PATH}${encodeURIComponent(token)}/tv`, ["tvKey", "remoteSecret"]),
    async report(tvKey, state) {
      await send("PUT", `${tvPath(tvKey)}/state`, state);
    },
  };
}

/** `EventSource` as the TV page uses it. */
export interface EventSourcePort {
  readonly readyState: number;
  addEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
}

export type OpenEventSource = (url: string) => EventSourcePort;

/** `EventSource.CLOSED`: the browser gave up, after a 404 `noSuchTv` or any other refusal. */
export const EVENT_SOURCE_CLOSED = 2;

/** An event of the TV's stream; `lost` is the stream closed for good. */
export type TvEvent =
  | {
      readonly type: "snapshot";
      readonly claimed: boolean;
      readonly showing: boolean;
      readonly remotePresent: boolean;
    }
  | { readonly type: "claimed" | "show" | "end" | "lost" }
  | { readonly type: "command"; readonly command: Command }
  | { readonly type: "remote"; readonly present: boolean };

export interface TvStreamListener {
  event(event: TvEvent): void;
  /** An event the page cannot read: a fault of the service, never the viewer's. */
  fault(error: unknown): void;
}

const SNAPSHOT_KEYS = ["claimed", "showing", "remotePresent"] as const;

const EVENT_READERS: Readonly<Record<string, (data: unknown) => TvEvent>> = {
  snapshot: (data) => {
    const root = readObject(data, "", SNAPSHOT_KEYS);
    return {
      type: "snapshot",
      claimed: readFlag(root, "claimed"),
      showing: readFlag(root, "showing"),
      remotePresent: readFlag(root, "remotePresent"),
    };
  },
  claimed: (data) => empty(data, "claimed"),
  show: (data) => empty(data, "show"),
  end: (data) => empty(data, "end"),
  command: (data) => ({ type: "command", command: readCommand(data) }),
  remote: (data) => ({
    type: "remote",
    present: readFlag(readObject(data, "", ["present"]), "present"),
  }),
};

/** Opens the TV's stream; returns the function that closes it. */
export function openTvStream(
  open: OpenEventSource,
  tvKey: string,
  listener: TvStreamListener,
): () => void {
  const source = open(`${tvPath(tvKey)}/events`);
  for (const [name, read] of Object.entries(EVENT_READERS)) {
    source.addEventListener(name, (event) => {
      let received: TvEvent;
      try {
        received = read(JSON.parse(event instanceof MessageEvent ? String(event.data) : ""));
      } catch (error: unknown) {
        listener.fault(error);
        return;
      }
      listener.event(received);
    });
  }
  source.addEventListener("error", () => {
    // Until CLOSED the browser reconnects by itself, and the snapshot it is sent says the rest.
    if (source.readyState !== EVENT_SOURCE_CLOSED) return;
    source.close();
    listener.event({ type: "lost" });
  });
  return () => source.close();
}

function empty(data: unknown, type: "claimed" | "show" | "end"): TvEvent {
  readObject(data, "", []);
  return { type };
}

function readFlag(object: JsonObject, key: string): boolean {
  const value = object[key];
  if (typeof value !== "boolean") throw new DocumentFormatError(key, "true or false", value);
  return value;
}
