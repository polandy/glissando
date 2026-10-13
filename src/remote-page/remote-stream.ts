import { isObject, readObject } from "../glissando-file/document-values";
import { readPlaybackState, type Command } from "../tv-remote/tv-protocol";
import type { CommandFailure, RemoteStreamEvent } from "./remote-model";

/**
 * The remote page's edge to the server (dev-docs/tv_remote/HTTP_API.md): the remote stream
 * behind an `EventSource` port, and the command POSTs.
 */

/** `EventSource.CONNECTING` and `.CLOSED`, which the page's tests have no global for. */
export const EVENT_SOURCE_CONNECTING = 0;
export const EVENT_SOURCE_CLOSED = 2;
/** How long a stream the browser gave up on waits before the server is asked again. */
export const RECONNECT_DELAY_MS = 3000;

export interface EventSourcePort {
  readonly readyState: number;
  addEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
}

export interface RemoteApiPorts {
  openEventSource(url: string): EventSourcePort;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  schedule(run: () => Promise<void>, delayMs: number): void;
  /** What the page cannot read or did not expect: logged, never shown. */
  reportError(error: unknown): void;
}

export interface RemoteApi {
  /** Opens the stream; each event and each loss goes to `listener` until `end`. */
  openStream(listener: (event: RemoteStreamEvent) => void): void;
  /** Null once carried out. */
  send(command: Command): Promise<CommandFailure | null>;
}

/** An event the remote stream sent that the page cannot read: a server fault. */
export class RemoteStreamFormatError extends Error {
  override readonly name = "RemoteStreamFormatError";
}

/** A command answered other than 204, 404 `noSuchTv` or 409 `tvAway`. */
export class RemoteCommandError extends Error {
  override readonly name = "RemoteCommandError";
}

const REMOTE_API_PATH = "/api/tv/remote/";
const NO_SUCH_TV = "noSuchTv";
const TV_AWAY = "tvAway";
const NOT_FOUND = 404;
const CONFLICT = 409;
const SNAPSHOT_KEYS = ["tvPresent", "state"] as const;
const TV_KEYS = ["present"] as const;

/** Each named event of the remote stream and how its data is read. */
const STREAM_EVENTS: Readonly<Record<string, (data: unknown) => RemoteStreamEvent>> = {
  snapshot(data) {
    const root = readObject(data, "snapshot", SNAPSHOT_KEYS);
    if (!("state" in root)) throw new RemoteStreamFormatError("the snapshot has no state");
    return {
      type: "snapshot",
      tvPresent: readFlag(root["tvPresent"], "tvPresent"),
      state: root["state"] === null ? null : readPlaybackState(root["state"]),
    };
  },
  state: (data) => ({ type: "state", state: readPlaybackState(data) }),
  tv: (data) => ({
    type: "tv",
    present: readFlag(readObject(data, "tv", TV_KEYS)["present"], "present"),
  }),
  end(data) {
    readObject(data, "end", []);
    return { type: "end" };
  },
};

export function createRemoteApi(secret: string, ports: RemoteApiPorts): RemoteApi {
  const base = `${REMOTE_API_PATH}${encodeURIComponent(secret)}`;
  const eventsUrl = `${base}/events`;

  function openStream(listener: (event: RemoteStreamEvent) => void): void {
    const source = ports.openEventSource(eventsUrl);
    for (const [name, read] of Object.entries(STREAM_EVENTS)) {
      source.addEventListener(name, (event) => {
        let streamEvent: RemoteStreamEvent;
        try {
          streamEvent = read(JSON.parse(event instanceof MessageEvent ? String(event.data) : ""));
        } catch (error: unknown) {
          ports.reportError(
            new RemoteStreamFormatError(`the remote stream's ${name} event`, { cause: error }),
          );
          return;
        }
        if (streamEvent.type === "end") source.close();
        listener(streamEvent);
      });
    }
    source.addEventListener("error", () => {
      listener({ type: "lost" });
      if (source.readyState !== EVENT_SOURCE_CLOSED) return;
      source.close();
      ports.schedule(() => probe(listener), RECONNECT_DELAY_MS);
    });
  }

  /** Asks whether the session still stands before the stream opens again. */
  async function probe(listener: (event: RemoteStreamEvent) => void): Promise<void> {
    const abort = new AbortController();
    let response: Response;
    try {
      response = await ports.fetch(eventsUrl, { signal: abort.signal });
    } catch (error: unknown) {
      ports.reportError(error);
      ports.schedule(() => probe(listener), RECONNECT_DELAY_MS);
      return;
    }
    if (response.ok) {
      abort.abort();
      openStream(listener);
    } else if ((await errorCode(response)) === NO_SUCH_TV) {
      listener({ type: "end" });
    } else {
      ports.schedule(() => probe(listener), RECONNECT_DELAY_MS);
    }
  }

  return {
    openStream,
    async send(command) {
      let response: Response;
      try {
        response = await ports.fetch(`${base}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
      } catch (error: unknown) {
        ports.reportError(error);
        return "failed";
      }
      if (response.ok) return null;
      const code = await errorCode(response);
      if (response.status === CONFLICT && code === TV_AWAY) return "tvAway";
      if (response.status === NOT_FOUND && code === NO_SUCH_TV) return "ended";
      ports.reportError(
        new RemoteCommandError(
          `the ${command.type} command was answered ${response.status} ${code ?? ""}`,
        ),
      );
      return "failed";
    },
  };
}

/** The `error` of the service's JSON answer; null for any other body (a proxy's page). */
async function errorCode(response: Response): Promise<string | null> {
  const body: unknown = await response.json().catch(() => null);
  return isObject(body) && typeof body["error"] === "string" ? body["error"] : null;
}

function readFlag(value: unknown, key: string): boolean {
  if (typeof value !== "boolean") {
    throw new RemoteStreamFormatError(
      `${key}: expected true or false, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}
