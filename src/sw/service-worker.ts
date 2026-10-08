// The service worker (ADR-0005), emitted as the classic script `sw.js`: it imports nothing the
// app imports, and the build writes the precache list into it.
import { cacheNameFor, cachesToSearch, versionsCacheFor } from "./app-caches";
import { forgetOldVersions, isSkipWaiting, type VersionStorePorts } from "./lifecycle";
import { parsePrecache, PRECACHE_PLACEHOLDER } from "./precache";
import { answersRequest, respond } from "./respond";

declare const self: ServiceWorkerGlobalScope;

const precache = parsePrecache(PRECACHE_PLACEHOLDER);
const SCOPE = self.registration.scope;
const INDEX_URL = new URL("index.html", self.location.href).href;
const CURRENT_CACHE = cacheNameFor(SCOPE, precache.version);
const VERSIONS_CACHE = versionsCacheFor(SCOPE);
// The record's key in its own cache, which no request is ever looked up in.
const VERSIONS_RECORD = new URL("?glissando-versions-record", SCOPE).href;

const versionStore: VersionStorePorts = {
  async readRecord() {
    const stored = await (await caches.open(VERSIONS_CACHE)).match(VERSIONS_RECORD);
    if (stored === undefined) {
      return undefined;
    }
    const record: unknown = await stored.json();
    return record;
  },
  async writeRecord(versions) {
    const record = new Response(JSON.stringify(versions));
    await (await caches.open(VERSIONS_CACHE)).put(VERSIONS_RECORD, record);
  },
  cacheNames: () => caches.keys(),
  deleteCache: (name) => caches.delete(name),
};

self.addEventListener("install", (event) => {
  // Revalidated, so an unhashed file such as index.html never comes from a stale HTTP cache.
  const requests = precache.files.map((file) => new Request(file, { cache: "no-cache" }));
  // No skipWaiting: a new version waits until the app reloads (ADR-0005).
  event.waitUntil(caches.open(CURRENT_CACHE).then((cache) => cache.addAll(requests)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(forgetOldVersions(versionStore, SCOPE, precache.version));
});

self.addEventListener("message", (event) => {
  if (isSkipWaiting(event.data)) {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", (event) => {
  if (!answersRequest(event.request, self.location.origin)) {
    return;
  }
  event.respondWith(
    respond(event.request, {
      indexUrl: INDEX_URL,
      caches: async () =>
        Promise.all(
          cachesToSearch(await caches.keys(), SCOPE, precache.version).map((name) =>
            caches.open(name),
          ),
        ),
      fetch: (request) => fetch(request),
    }),
  );
});
