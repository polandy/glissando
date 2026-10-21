import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type { APIRequestContext, Page, Route } from "@playwright/test";
import { maxBodyBytes, type RequestBody } from "../../server/library-http";
import { createTvHub, type TvHub } from "../../server/tv/tv-hub";
import type { LibraryRepository, SlideshowRecord } from "../../server/library-repository";
import { createTvHandler, isStreamAnswer } from "../../server/tv/tv-routes";
import type { FakeGlissandoServer } from "./fake-glissando-server";
import { TV_STREAM_PUSH_PATH, TV_STREAM_QUERY } from "./tv-stream-plugin";

/**
 * The TV remote's public and private HTTP API (dev-docs/tv_remote/HTTP_API.md), answered by the
 * real hub and routes on the fake library's slideshows, plus `/tv` and `/r/<secret>`: what
 * `vite preview` serves at `/share.html` and `/remote.html`, with the headers Caddy adds.
 *
 * Every plain request answers from `route.fulfill`, on the page's own origin. A stream
 * (`EventSource`) cannot: `route.fulfill`'s body is always a complete, already-closed response,
 * which the remote page reads as a lost connection. `tv-stream-plugin.ts` holds the stream open on
 * `vite preview`'s process instead, as `src/remote-page/testing/fake-remote-api-command.ts` does
 * for the browser tests; another origin would break the pages' `connect-src 'self'`.
 */

/** Requests under these paths go to the TV handler, in the same context as `fakeGlissandoServer`. */
const TV_API_ROUTE = /\/api\/(tv\/.*|library\/tv\/.*|share\/[^/]+\/tv)$/;
/**
 * The TV's and the remote's own pages, anchored right after the origin: unanchored, `/tv$` also
 * matches way B's `POST /api/share/<token>/tv`, whose URL happens to end the same way, and then
 * wins over `TV_API_ROUTE` because it is registered after it (Playwright favours the most
 * recently registered route).
 */
const TV_PAGE_ROUTE = /^https?:\/\/[^/]+\/tv$/;
const REMOTE_PAGE_ROUTE = /^https?:\/\/[^/]+\/r\/[^/]+$/;
/** Way A's picture route: Caddy answers it from Immich, through the TV's chosen slideshow. */
const TV_PICTURE_ROUTE = /\/api\/tv\/([^/]+)\/show\/\d+\/pictures\/(\d+)$/;
const SHARE_PAGE_FILE = "/share.html";
const REMOTE_PAGE_FILE = "/remote.html";
const HTTP_NOT_FOUND = 404;

/** A slideshow this fake's repository never reads or writes, named so a stub throws loudly. */
function unsupported(name: string): () => never {
  return () => {
    throw new Error(`the e2e TV fake's repository has no ${name}`);
  };
}

/** The fake library's slideshows, as the TV routes need to read them. */
function tvRepositoryOf(server: FakeGlissandoServer): LibraryRepository {
  const toRecord = (id: string, revision: number, document: SlideshowRecord["document"]) => ({
    id,
    revision,
    // The TV routes never read createdAt; a fixed value only satisfies the type.
    createdAt: 0,
    document,
  });
  return {
    inTransaction: (work) => work(),
    listSlideshows: unsupported("listSlideshows"),
    findSlideshow: (id) => {
      const found = server.slideshows.find((slideshow) => slideshow.id === id);
      return found === undefined ? undefined : toRecord(found.id, found.revision, found.document);
    },
    insertSlideshow: unsupported("insertSlideshow"),
    updateSlideshow: unsupported("updateSlideshow"),
    deleteSlideshow: unsupported("deleteSlideshow"),
    share: unsupported("share"),
    unshare: unsupported("unshare"),
    shareOf: unsupported("shareOf"),
    slideshowByShareToken: (token) => {
      const found = server.slideshows.find((slideshow) => slideshow.share?.token === token);
      return found === undefined ? undefined : toRecord(found.id, found.revision, found.document);
    },
    findMusic: () => undefined,
    insertMusic: unsupported("insertMusic"),
    deleteMusic: unsupported("deleteMusic"),
    findMusicBeats: () => undefined,
    putMusicBeats: unsupported("putMusicBeats"),
    findMusicLoudness: () => undefined,
    putMusicLoudness: unsupported("putMusicLoudness"),
    isMusicReferenced: unsupported("isMusicReferenced"),
    restartMusicGrace: unsupported("restartMusicGrace"),
    unreferencedMusicUploadedBefore: unsupported("unreferencedMusicUploadedBefore"),
    findPictureFocus: unsupported("findPictureFocus"),
    putPictureFocus: unsupported("putPictureFocus"),
    isPictureReferenced: unsupported("isPictureReferenced"),
    deletePictureFocus: unsupported("deletePictureFocus"),
  };
}

/** The built page's bytes: small files, read fresh rather than kept across the whole run. */
function builtPage(file: string): Uint8Array {
  return readFileSync(new URL(`../../dist${file}`, import.meta.url));
}

/** Serves `path` from `builtFile` as Caddy does: `no-cache`, `no-referrer`. */
function attachPageRoute(target: Page, pattern: RegExp, builtFile: string): void {
  void target.route(pattern, (route) =>
    route.fulfill({
      status: 200,
      headers: { "cache-control": "no-cache", "referrer-policy": "no-referrer" },
      contentType: "text/html",
      body: builtPage(builtFile),
    }),
  );
}

/** `route`'s body, in the shape `createTvHandler` reads it, `path`'s own limit enforced. */
function bodyOf(route: Route, path: string): RequestBody {
  const bytes = route.request().postDataBuffer() ?? new Uint8Array(0);
  return bytes.byteLength > maxBodyBytes(path) ? { kind: "tooLarge" } : { kind: "received", bytes };
}

/** `event.name`/`event.data` as one `text/event-stream` line, the shape `pipeEventStream` sends. */
function sseLine(event: { readonly name: string; readonly data: unknown }): string {
  return `event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Pushes each line to `tv-stream-plugin.ts` for its stream path, one after another, so the
 * browser sees them in the order the hub sent them.
 */
function streamPusher(request: APIRequestContext): (path: string, line: string) => Promise<void> {
  let pushed = Promise.resolve();
  return (path, line) => {
    pushed = pushed.then(async () => {
      const answer = await request.post(TV_STREAM_PUSH_PATH, { params: { path, line } });
      if (!answer.ok()) throw new Error(`pushing a TV stream line failed: ${answer.status()}`);
    });
    return pushed;
  };
}

type Push = ReturnType<typeof streamPusher>;

/**
 * Runs the real hub and routes for a request. A stream's sink pushes every event to
 * `tv-stream-plugin.ts`, and the browser's request continues there once the replayed snapshot is in. The
 * sink's `CloseStream` is never called: to the hub it means the page went away, and the page's
 * connection stays open on the plugin.
 */
async function answerTvApi(
  route: Route,
  handle: ReturnType<typeof createTvHandler>,
  push: Push,
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const answer = handle({
    method: request.method(),
    path,
    headers: request.headers(),
    body: bodyOf(route, path),
  });
  if (!isStreamAnswer(answer)) {
    return route.fulfill({ status: answer.status, headers: answer.headers, body: answer.body });
  }
  let pushed = Promise.resolve();
  answer.open({
    send: (event) => {
      pushed = push(path, sseLine(event));
    },
    close: () => undefined,
  });
  await pushed;
  const target = new URL(url.toString());
  target.searchParams.set(TV_STREAM_QUERY, "1");
  await route.continue({ url: target.href });
}

/** Routes `target`'s TV API, pages and pictures onto the one hub the test's session lives on. */
function attachApiRoute(
  target: Page,
  handle: ReturnType<typeof createTvHandler>,
  push: Push,
  hub: TvHub,
  server: FakeGlissandoServer,
  photo: () => Uint8Array,
): void {
  void target.route(TV_API_ROUTE, (route) => answerTvApi(route, handle, push));
  attachPageRoute(target, TV_PAGE_ROUTE, SHARE_PAGE_FILE);
  attachPageRoute(target, REMOTE_PAGE_ROUTE, REMOTE_PAGE_FILE);
  void target.route(TV_PICTURE_ROUTE, async (route) => {
    const [, tvKey, position] =
      TV_PICTURE_ROUTE.exec(new URL(route.request().url()).pathname) ?? [];
    const picture = pictureShownBy(hub, server, tvKey ?? "", Number(position));
    if (picture === undefined) {
      return route.fulfill({ status: HTTP_NOT_FOUND, json: { error: "notShown", detail: "" } });
    }
    if (server.goneFromImmich.has(picture.immichAssetId)) {
      return route.fulfill({ status: HTTP_NOT_FOUND });
    }
    return route.fulfill({ contentType: "image/jpeg", body: photo() });
  });
}

/** The picture at `position` of the slideshow the TV `tvKey` currently shows, if any. */
function pictureShownBy(hub: TvHub, server: FakeGlissandoServer, tvKey: string, position: number) {
  const source = hub.sourceOf(tvKey);
  if (source === undefined) return undefined;
  const slideshowId = source.kind === "chosen" ? source.slideshowId : undefined;
  const record = server.slideshows.find((slideshow) => slideshow.id === slideshowId);
  return record?.document.slideshow.pictures[position];
}

/** What `attachTvApi` hands back: a way to wire the same session into a further page. */
export interface TvApi {
  /**
   * Routes the TV API (and `/tv`, `/r/<secret>`) on `target` too, sharing the one hub: a phone, a
   * TV and a remote page opened in the same browser context must each call this (or
   * `fakeGlissandoServer`'s `attachPage`, which does) before they navigate, so they share one
   * session, as the real service's clients do.
   */
  attachTo(target: Page): void;
}

/**
 * Wires the TV remote's HTTP API into `page`: the real hub and routes (`server/tv/`) on the fake
 * library's slideshows.
 */
export function attachTvApi(
  page: Page,
  server: FakeGlissandoServer,
  photo: () => Uint8Array,
): TvApi {
  const hub = createTvHub({ now: Date.now, randomBytes });
  const handle = createTvHandler({ repository: tvRepositoryOf(server), hub, log: () => undefined });
  const push = streamPusher(page.context().request);
  const attachTo = (target: Page) => {
    attachApiRoute(target, handle, push, hub, server, photo);
  };
  attachTo(page);
  return { attachTo };
}
