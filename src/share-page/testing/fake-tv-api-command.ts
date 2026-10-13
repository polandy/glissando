import type { BrowserCommand } from "vitest/node";
import type { FakeTvApi } from "./fake-tv-api.ts";

/** Node's `Buffer`, which Playwright answers bytes with; the tsconfig carries no Node types. */
declare const Buffer: { from(base64: string, encoding: "base64"): Uint8Array };

const CREATED = 201;
const NO_CONTENT = 204;
const NOT_FOUND = 404;
/**
 * How soon the page's `EventSource` comes back for more: each answer of the stream carries the
 * events sent since the last and ends, as Playwright's `fulfill` cannot keep a stream open; the
 * browser reconnects by itself, as it would after a dropped connection.
 */
const RECONNECT_MS = 100;
const PAGE_PATTERN = "**/tv";
const API_PATTERN = "**/api/tv/**";
const SESSIONS_PATH = "/api/tv/sessions";
const TV_PATH = /^\/api\/tv\/key-([^/]+)\/(events|state|show)(\/.*)?$/;

/** Values handed out in order, each taken once, a take waiting for the next put. */
class Queue<T> {
  readonly #items: T[] = [];
  readonly #takers: ((item: T) => void)[] = [];
  put(item: T): void {
    const taker = this.#takers.shift();
    if (taker === undefined) this.#items.push(item);
    else taker(item);
  }
  take(): Promise<T> {
    const [first] = this.#items;
    if (first !== undefined) {
      this.#items.shift();
      return Promise.resolve(first);
    }
    return new Promise((resolve) => this.#takers.push(resolve));
  }
}

interface ServedFake {
  /** The session as each answer's snapshot tells it, as the service's would. */
  readonly snapshot: { claimed: boolean; showing: boolean; remotePresent: boolean };
  /** The stream's events not yet answered. */
  readonly pending: string[];
  readonly reports: Queue<unknown>;
}

/** Each browser session's fake TV API. */
const served = new Map<string, ServedFake>();

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Browser commands (run by Vitest in Node) that answer the TV page at `/tv` and the public TV
 * routes in the test's browser page, frames included: the TV page's browser test runs against
 * them (dev-docs/tv_remote/TV_PAGE.md).
 */
export const serveFakeTvApi: BrowserCommand<[fake: FakeTvApi]> = async (context, fake) => {
  if (!("page" in context)) throw new Error("the fake TV API needs the Playwright provider");
  await stopFakeTvApi(context);
  const tv: ServedFake = {
    snapshot: { claimed: false, showing: false, remotePresent: false },
    pending: [],
    reports: new Queue<unknown>(),
  };
  served.set(context.sessionId, tv);
  const codes = [...fake.codes];
  await context.page.route(PAGE_PATTERN, (route) =>
    route.fulfill({ body: fake.sharePage, contentType: "text/html; charset=utf-8" }),
  );
  await context.page.route(API_PATTERN, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === SESSIONS_PATH) {
      const code = codes.shift();
      if (code === undefined) throw new Error("the fake TV API has no code left");
      return route.fulfill({ status: CREATED, json: { tvKey: `key-${code}`, code } });
    }
    const [, , kind, rest = ""] = TV_PATH.exec(path) ?? [];
    if (kind === "events") {
      const events = [sseEvent("snapshot", tv.snapshot), ...tv.pending.splice(0)];
      return route.fulfill({
        body: `retry: ${String(RECONNECT_MS)}\n\n${events.join("")}`,
        contentType: "text/event-stream",
      });
    }
    if (kind === "state") {
      tv.reports.put(route.request().postDataJSON());
      return route.fulfill({ status: NO_CONTENT, body: "" });
    }
    if (kind === "show" && rest === "") return route.fulfill({ json: fake.answer });
    const picture = /^\/\d+\/pictures\/(\d+)$/.exec(rest);
    const song = /^\/songs\/(\d+)$/.exec(rest);
    const medium = picture
      ? fake.pictures[Number(picture[1])]
      : song
        ? fake.songs[Number(song[1])]
        : undefined;
    if (kind !== "show" || medium === undefined) {
      return route.fulfill({ status: NOT_FOUND, json: { error: "noSuchTv", detail: path } });
    }
    return route.fulfill({ body: Buffer.from(medium.base64, "base64"), contentType: medium.type });
  });
};

function servedFake(sessionId: string): ServedFake {
  const fake = served.get(sessionId);
  if (fake === undefined) throw new Error("the fake TV API is not served");
  return fake;
}

/** Queues the event for the stream's next answer, the snapshot following suit. */
export const sendFakeTvEvent: BrowserCommand<[type: string, data: unknown]> = (
  context,
  type,
  data,
) => {
  const fake = servedFake(context.sessionId);
  if (type === "claimed") fake.snapshot.claimed = true;
  if (type === "show") fake.snapshot.showing = true;
  if (type === "end") Object.assign(fake.snapshot, { claimed: false, showing: false });
  fake.pending.push(sseEvent(type, data));
};

export const nextFakeTvReport: BrowserCommand<[]> = (context) =>
  servedFake(context.sessionId).reports.take();

export const stopFakeTvApi: BrowserCommand<[]> = async (context) => {
  if (!("page" in context)) throw new Error("the fake TV API needs the Playwright provider");
  await context.page.unroute(PAGE_PATTERN);
  await context.page.unroute(API_PATTERN);
  served.delete(context.sessionId);
};
