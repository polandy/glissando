import type { BrowserCommand } from "vitest/node";
import type { FakeShareApi } from "./fake-share-api";

/** Node's `Buffer`, which Playwright answers bytes with; the tsconfig carries no Node types. */
declare const Buffer: { from(base64: string, encoding: "base64"): Uint8Array };

/** The fake routes by token, so a second call for a token replaces its routes. */
const ROUTE_PATTERN = (token: string) => `**/api/share/${token}**`;
const PAGE_PATTERN = (token: string) => `**/s/${token}`;
const SERVICE_UNAVAILABLE = 503;
const NOT_FOUND = 404;
/** Each browser session's held picture by token, answered once released. */
const holdKey = (sessionId: string, token: string) => `${sessionId} ${token}`;
/** `released` tells whether the picture is still to be answered, false once the fake stopped. */
const holds = new Map<
  string,
  { readonly released: Promise<boolean>; readonly release: (answer: boolean) => void }
>();

/**
 * Browser commands (run by Vitest in Node) that answer the share link and the share API for a
 * token in the test's browser page, frames included, with Playwright's routing: the share page's browser test plays
 * against them (dev-docs/SHARE_LINK.md, End to end).
 */
export const serveFakeShareApi: BrowserCommand<[fake: FakeShareApi]> = async (context, fake) => {
  if (!("page" in context)) throw new Error("the fake share API needs the Playwright provider");
  const pattern = ROUTE_PATTERN(fake.token);
  const base = `/api/share/${fake.token}`;
  await context.page.unroute(pattern);
  await context.page.unroute(PAGE_PATTERN(fake.token));
  await context.page.route(PAGE_PATTERN(fake.token), (route) =>
    route.fulfill({ body: fake.sharePage, contentType: "text/html; charset=utf-8" }),
  );
  const { promise: released, resolve: release } = Promise.withResolvers<boolean>();
  holds.set(holdKey(context.sessionId, fake.token), { released, release });
  await context.page.route(pattern, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (fake.mode === "unreachable") {
      await route.fulfill({ status: SERVICE_UNAVAILABLE, body: "" });
      return;
    }
    const notFound = (error: string) =>
      route.fulfill({ status: NOT_FOUND, json: { error, detail: path } });
    if (fake.mode === "gone") return notFound("notShared");
    if (path === base) return route.fulfill({ json: fake.answer });
    const picture = /\/\d+\/pictures\/(\d+)$/.exec(path);
    const song = /\/songs\/(\d+)$/.exec(path);
    const medium = picture
      ? Number(picture[1]) === fake.missingPicture
        ? undefined
        : fake.pictures[Number(picture[1])]
      : song
        ? fake.songs[Number(song[1])]
        : undefined;
    if (medium === undefined) return notFound(picture ? "noSuchPicture" : "noSuchSong");
    if (picture && Number(picture[1]) === fake.heldPicture && !(await released)) return;
    return route.fulfill({
      body: Buffer.from(medium.base64, "base64"),
      contentType: medium.type,
    });
  });
};

export const stopFakeShareApi: BrowserCommand<[token: string]> = async (context, token) => {
  if (!("page" in context)) throw new Error("the fake share API needs the Playwright provider");
  const key = holdKey(context.sessionId, token);
  holds.get(key)?.release(false);
  holds.delete(key);
  await context.page.unroute(ROUTE_PATTERN(token));
  await context.page.unroute(PAGE_PATTERN(token));
};

export const releaseFakeSharePicture: BrowserCommand<[token: string]> = (context, token) => {
  const hold = holds.get(holdKey(context.sessionId, token));
  if (hold === undefined) throw new Error(`the fake share API serves no token ${token}`);
  hold.release(true);
};
