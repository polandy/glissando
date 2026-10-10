import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";

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
}

/** The server document, read only as far as the cases look into it. */
interface ServerDocument {
  readonly slideshow: { readonly title: string; readonly pictures: { immichAssetId: string }[] };
}

/** What the fake self-hosted Glissando saw and holds; the case changes `goneFromImmich`. */
export interface FakeGlissandoServer {
  /** The library service's slideshows, oldest first. */
  readonly slideshows: LibraryRecord[];
  /** Immich assets whose originals the app asked for. */
  readonly originalsAsked: string[];
  /** Assets Immich answers 404 for, as for a photo deleted in Immich. */
  readonly goneFromImmich: Set<string>;
}

const IMMICH_ROUTE = /\/immich\/(.*)$/;
const LIBRARY_ROUTE = /\/api\/library(\/.*)?$/;
const ASSET_IMAGE = /^api\/assets\/([^/]+)\/(thumbnail|original)$/;
const SLIDESHOW_PATH = /^\/slideshows\/([^/]+)$/;
const HTTP_CREATED = 201;
const HTTP_NOT_FOUND = 404;
const HTTP_PRECONDITION_FAILED = 412;

/**
 * Answers the self-hosted Glissando's `/immich/` route like Immich behind it (every photo is
 * `photo()`) and its `/api/library` route like the library service, in memory: both answer at once
 * from the state the case set, so nothing a case waits on depends on timing.
 */
export async function fakeGlissandoServer(
  page: Page,
  photo: () => Uint8Array,
): Promise<FakeGlissandoServer> {
  const server: FakeGlissandoServer = {
    slideshows: [],
    originalsAsked: [],
    goneFromImmich: new Set(),
  };
  await page.route(IMMICH_ROUTE, (route) => answerImmich(route, server, photo));
  await page.route(LIBRARY_ROUTE, (route) => answerLibrary(route, server));
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
    };
    server.slideshows.push(record);
    return route.fulfill({
      status: HTTP_CREATED,
      json: { id: record.id, revision: record.revision },
    });
  }
  const id = path.match(SLIDESHOW_PATH)?.[1];
  const record = server.slideshows.find((slideshow) => slideshow.id === id);
  if (record === undefined) {
    return route.fulfill({ status: HTTP_NOT_FOUND, json: { error: "notFound", detail: path } });
  }
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
