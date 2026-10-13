import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { shareDocumentOf } from "../../server/share-document";
import type { ServerDocument } from "../../src/server-library/server-document";

/** A recorded answer of a real Immich (`src/immich/fixtures`). */
export function immichFixture<Answer>(name: string): Answer {
  const bytes = readFileSync(new URL(`../../src/immich/fixtures/${name}.json`, import.meta.url));
  return JSON.parse(new TextDecoder().decode(bytes)) as Answer;
}

/** An asset as Immich's search lists it; only the fields the cases read are typed. */
export interface ImmichAsset {
  readonly id: string;
  readonly originalFileName: string;
}

interface ImmichSearch {
  readonly assets: { readonly items: ImmichAsset[]; readonly nextPage: string | null };
}

const RECORDED_PAGE = immichFixture<ImmichSearch>("search-all-page-1");

/** "All photos" of the fake Immich: the recorded first page of a real library, as its only one. */
export const LIBRARY_PAGE: ImmichSearch = {
  assets: { items: RECORDED_PAGE.assets.items, nextPage: null },
};

/** A server slideshow as the fake library service keeps it. */
interface LibraryRecord {
  readonly id: string;
  revision: number;
  document: ServerDocument;
  /** Its link (share_link/HTTP_API.md, Private); null while it is not shared. */
  share: { readonly token: string; readonly createdAt: string } | null;
}

/** What the fake self-hosted Glissando saw and holds; the case changes `goneFromImmich`. */
export interface FakeGlissandoServer {
  /** The library service's slideshows, oldest first. */
  readonly slideshows: LibraryRecord[];
  /** Immich assets whose originals the app asked for. */
  readonly originalsAsked: string[];
  /** Immich assets whose preview (the 1440-pixel rendition) the app asked for. */
  readonly previewsAsked: string[];
  /** Assets Immich answers 404 for, as for a photo deleted in Immich. */
  readonly goneFromImmich: Set<string>;
  /** Links made so far; each one's token ends in its count, so sharing again makes a new link. */
  linksMade: number;
}

const IMMICH_ROUTE = /\/immich\/(.*)$/;
const LIBRARY_ROUTE = /\/api\/library(\/.*)?$/;
const ASSET_IMAGE = /^api\/assets\/([^/]+)\/(thumbnail|original)$/;
const SLIDESHOW_PATH = /^\/slideshows\/([^/]+)(\/share)?$/;
/** The recipient's page and the public share API (share_link/HTTP_API.md, Public). */
const SHARE_PAGE_ROUTE = /\/s\/[^/]+$/;
const SHARE_API_ROUTE = /\/api\/share\/.*$/;
const SHARE_API_PATH = /^\/api\/share\/([^/]+)(?:\/(\d+)\/pictures\/(\d+))?$/;
/** The built page Caddy answers every `/s/<token>` with, as `vite preview` serves it. */
const SHARE_PAGE_FILE = "/share.html";
/** Every link the fake makes, as a real token looks: 22 characters of base64url. */
const FAKE_SHARE_TOKEN_PREFIX = "fakeShareToken";
const FAKE_SHARE_TOKEN_COUNT_DIGITS = 8;
/** When the fake made every link: a fixed instant, so nothing reads the clock. */
const FAKE_SHARE_CREATED_AT = "2026-10-11T09:30:00.000Z";
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_CREATED = 201;
const HTTP_NOT_FOUND = 404;
const HTTP_PRECONDITION_FAILED = 412;

/**
 * Answers the self-hosted Glissando's `/immich/` route like Immich behind it (every photo is
 * `photo()`) and its `/api/library` route like the library service, in memory: both answer at once
 * from the state the case set, so nothing a case waits on depends on timing. A share link's
 * `/s/<token>` and `/api/share/` answer in every page of the page's browser context, so a second
 * page can open the link; pictures come straight from the fake, where the real server fetches
 * them from Immich through Caddy.
 */
export async function fakeGlissandoServer(
  page: Page,
  photo: () => Uint8Array,
): Promise<FakeGlissandoServer> {
  const server: FakeGlissandoServer = {
    slideshows: [],
    originalsAsked: [],
    previewsAsked: [],
    goneFromImmich: new Set(),
    linksMade: 0,
  };
  await page.route(IMMICH_ROUTE, (route) => answerImmich(route, server, photo));
  await page.route(LIBRARY_ROUTE, (route) => answerLibrary(route, server));
  await page.context().route(SHARE_PAGE_ROUTE, async (route) => {
    const sharePage = new URL(SHARE_PAGE_FILE, route.request().url()).href;
    await route.fulfill({ response: await route.fetch({ url: sharePage }) });
  });
  await page.context().route(SHARE_API_ROUTE, (route) => answerShareApi(route, server, photo));
  return server;
}

function answerImmich(route: Route, server: FakeGlissandoServer, photo: () => Uint8Array) {
  const request = route.request();
  const path = new URL(request.url()).pathname.match(IMMICH_ROUTE)?.[1] ?? "";
  if (path === "api/server/version")
    return route.fulfill({ json: immichFixture("server-version") });
  if (path === "api/albums") return route.fulfill({ json: immichFixture("albums") });
  if (path === "api/search/metadata") return route.fulfill({ json: LIBRARY_PAGE });
  if (path === "api/faces") return route.fulfill({ json: [] });
  const image = path.match(ASSET_IMAGE);
  if (image === null) return route.fulfill({ status: HTTP_NOT_FOUND });
  const [, assetId = "", kind] = image;
  if (kind === "original") server.originalsAsked.push(assetId);
  if (kind === "thumbnail" && new URL(request.url()).searchParams.get("size") === "preview") {
    server.previewsAsked.push(assetId);
  }
  if (server.goneFromImmich.has(assetId)) return route.fulfill({ status: HTTP_NOT_FOUND });
  return route.fulfill({ contentType: "image/jpeg", body: photo() });
}

function answerLibrary(route: Route, server: FakeGlissandoServer) {
  const request = route.request();
  const method = request.method();
  const path = new URL(request.url()).pathname.match(LIBRARY_ROUTE)?.[1] ?? "";
  if (path === "" && method === "GET") {
    return route.fulfill({ json: { service: "glissando-library", version: 1 } });
  }
  if (path === "/slideshows" && method === "GET") {
    return route.fulfill({ json: { slideshows: [...server.slideshows].reverse() } });
  }
  if (path === "/slideshows" && method === "POST") {
    const record = {
      id: `server-slideshow-${String(server.slideshows.length + 1)}`,
      revision: 1,
      document: request.postDataJSON() as ServerDocument,
      share: null,
    };
    server.slideshows.push(record);
    return route.fulfill({
      status: HTTP_CREATED,
      json: { id: record.id, revision: record.revision },
    });
  }
  const [, id, share] = path.match(SLIDESHOW_PATH) ?? [];
  const record = server.slideshows.find((slideshow) => slideshow.id === id);
  if (record === undefined) {
    return route.fulfill({ status: HTTP_NOT_FOUND, json: { error: "notFound", detail: path } });
  }
  if (share !== undefined) return answerShare(route, server, record, path);
  if (method === "GET") return route.fulfill({ json: record });
  if (method === "PUT") {
    if (request.headers()["if-match"] !== `"${String(record.revision)}"`) {
      return route.fulfill({
        status: HTTP_PRECONDITION_FAILED,
        json: { error: "revisionChanged", detail: path, current: record },
      });
    }
    record.revision += 1;
    record.document = request.postDataJSON() as ServerDocument;
    return route.fulfill({ json: { revision: record.revision } });
  }
  return route.fulfill({ status: HTTP_NOT_FOUND, json: { error: "notFound", detail: path } });
}

function answerShare(
  route: Route,
  server: FakeGlissandoServer,
  record: LibraryRecord,
  path: string,
) {
  const method = route.request().method();
  if (method === "POST") {
    const created = record.share === null;
    if (created) {
      server.linksMade += 1;
      const count = String(server.linksMade).padStart(FAKE_SHARE_TOKEN_COUNT_DIGITS, "0");
      record.share = { token: FAKE_SHARE_TOKEN_PREFIX + count, createdAt: FAKE_SHARE_CREATED_AT };
    }
    return route.fulfill({ status: created ? HTTP_CREATED : HTTP_OK, json: record.share });
  }
  if (method === "DELETE") {
    if (record.share === null) {
      return route.fulfill({ status: HTTP_NOT_FOUND, json: { error: "notShared", detail: path } });
    }
    record.share = null;
    return route.fulfill({ status: HTTP_NO_CONTENT });
  }
  return route.fulfill({ status: HTTP_NOT_FOUND, json: { error: "notFound", detail: path } });
}

/** The document and the pictures; no songs, as no case shares a slideshow with music. */
function answerShareApi(route: Route, server: FakeGlissandoServer, photo: () => Uint8Array) {
  const path = new URL(route.request().url()).pathname;
  const notFound = (error: string) =>
    route.fulfill({ status: HTTP_NOT_FOUND, json: { error, detail: path } });
  const match = path.match(SHARE_API_PATH);
  if (match === null) return notFound("notFound");
  const [, token, revision, position] = match;
  const record = server.slideshows.find((slideshow) => slideshow.share?.token === token);
  if (route.request().method() !== "GET" || record === undefined) return notFound("notShared");
  const { slideshow } = record.document;
  if (revision === undefined) {
    return route.fulfill({
      json: {
        revision: record.revision,
        slideshow: shareDocumentOf(slideshow),
        beats: slideshow.songs.map(() => null),
      },
    });
  }
  const picture = slideshow.pictures[Number(position)];
  if (picture === undefined) return notFound("noSuchPicture");
  if (server.goneFromImmich.has(picture.immichAssetId)) {
    return route.fulfill({ status: HTTP_NOT_FOUND });
  }
  return route.fulfill({ contentType: "image/jpeg", body: photo() });
}
