import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { BrowserCommand } from "vitest/node";
import type { FakeRemoteApi } from "./fake-remote-api.ts";

const OK = 200;
const NO_CONTENT = 204;
const PAGE_PATTERN = (secret: string) => `**/r/${secret}`;
const COMMAND_PATTERN = (secret: string) => `**/api/tv/remote/${secret}/command`;
const EVENTS_PATH = /^\/api\/tv\/remote\/([^/?]+)\/events(?:\?|$)/;

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
    const [item] = this.#items.splice(0, 1);
    if (item !== undefined) return Promise.resolve(item);
    return new Promise((resolve) => this.#takers.push(resolve));
  }
}

interface ServedFake {
  readonly snapshot: unknown;
  readonly streams: Set<ServerResponse>;
  /** Called, and emptied, whenever a stream opens. */
  readonly onOpen: (() => void)[];
  readonly commands: Queue<unknown>;
}

/** The fakes by secret; each browser's test uses its own secret. */
const served = new Map<string, ServedFake>();

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Serves the fakes' event streams from the browser tests' own server, so a stream stays open as
 * the real one does: Playwright's `fulfill` ends every stream it answers, and a stream continued
 * to another origin breaks the page's `connect-src 'self'` in Chromium and WebKit. Any other
 * request passes on.
 */
export function fakeRemoteStreamPlugin(): Plugin {
  return {
    name: "glissando:fake-remote-stream",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const secret = EVENTS_PATH.exec(request.originalUrl ?? "")?.[1];
        const fake = secret === undefined ? undefined : served.get(secret);
        if (fake === undefined) {
          next();
          return;
        }
        response.writeHead(OK, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        response.write(sseEvent("snapshot", fake.snapshot));
        fake.streams.add(response);
        response.once("close", () => fake.streams.delete(response));
        for (const opened of fake.onOpen.splice(0)) opened();
      });
    },
  };
}

/**
 * Browser commands (run by Vitest in Node) that answer the remote page and its commands for a
 * secret in the test's browser page, frames included, with Playwright's routing, its stream
 * coming from `fakeRemoteStreamPlugin`: the remote page's browser test runs against them
 * (dev-docs/tv_remote/REMOTE_PAGE.md).
 */
export const serveFakeRemoteApi: BrowserCommand<[fake: FakeRemoteApi]> = async (context, fake) => {
  if (!("page" in context)) throw new Error("the fake remote API needs the Playwright provider");
  await stopFakeRemoteApi(context, fake.secret);
  const commands = new Queue<unknown>();
  served.set(fake.secret, { snapshot: fake.snapshot, streams: new Set(), onOpen: [], commands });
  await context.page.route(PAGE_PATTERN(fake.secret), (route) =>
    route.fulfill({ body: fake.remotePage, contentType: "text/html; charset=utf-8" }),
  );
  await context.page.route(COMMAND_PATTERN(fake.secret), (route) => {
    commands.put(route.request().postDataJSON());
    return route.fulfill({ status: NO_CONTENT, body: "" });
  });
};

function servedFake(secret: string): ServedFake {
  const fake = served.get(secret);
  if (fake === undefined) throw new Error(`the fake remote API serves no secret ${secret}`);
  return fake;
}

export const sendFakeRemoteEvent: BrowserCommand<
  [secret: string, type: string, data: unknown]
> = async (_context, secret, type, data) => {
  const fake = servedFake(secret);
  while (fake.streams.size === 0) {
    await new Promise<void>((resolve) => fake.onOpen.push(resolve));
  }
  for (const response of fake.streams) response.write(sseEvent(type, data));
};

export const nextFakeRemoteCommand: BrowserCommand<[secret: string]> = (_context, secret) =>
  servedFake(secret).commands.take();

export const stopFakeRemoteApi: BrowserCommand<[secret: string]> = async (context, secret) => {
  if (!("page" in context)) throw new Error("the fake remote API needs the Playwright provider");
  await context.page.unroute(PAGE_PATTERN(secret));
  await context.page.unroute(COMMAND_PATTERN(secret));
  const fake = served.get(secret);
  served.delete(secret);
  for (const response of fake?.streams ?? []) response.end();
};
