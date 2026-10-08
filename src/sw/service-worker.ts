// The service worker (ADR-0005), emitted as the classic script `sw.js`: it imports nothing the
// app imports, and the build writes the precache list into it.
import { cacheNameFor, cachesToDelete, versionsAfterActivating } from "./app-caches";
import type { SkipWaitingMessage } from "./messages";
import { parsePrecache, PRECACHE_PLACEHOLDER } from "./precache";
import { respond } from "./respond";

declare const self: ServiceWorkerGlobalScope;

const precache = parsePrecache(PRECACHE_PLACEHOLDER);
const INDEX_URL = new URL("index.html", self.location.href).href;
// Which versions were activated, oldest first, so activating knows the previous one.
const VERSIONS_CACHE = "glissando-versions";
const VERSIONS_URL = new URL("versions.json", self.location.href).href;
const SKIP_WAITING_TYPE: SkipWaitingMessage["type"] = "SKIP_WAITING";
const GET = "GET";

self.addEventListener("install", (event) => {
  // Revalidated, so an unhashed file such as index.html never comes from a stale HTTP cache.
  const requests = precache.files.map((file) => new Request(file, { cache: "no-cache" }));
  // No skipWaiting: a new version waits until the app reloads (ADR-0005).
  event.waitUntil(
    caches.open(cacheNameFor(precache.version)).then((cache) => cache.addAll(requests)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(forgetOldVersions());
});

self.addEventListener("message", (event) => {
  if (isSkipWaiting(event.data)) {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== GET) {
    return;
  }
  event.respondWith(
    respond(event.request, {
      indexUrl: INDEX_URL,
      match: (url) => caches.match(url),
      fetch: (request) => fetch(request),
    }),
  );
});

async function forgetOldVersions(): Promise<void> {
  const versions = await caches.open(VERSIONS_CACHE);
  const kept = versionsAfterActivating(await seenVersions(versions), precache.version);
  await versions.put(VERSIONS_URL, new Response(JSON.stringify(kept)));
  const stale = cachesToDelete(await caches.keys(), kept);
  await Promise.all(stale.map((name) => caches.delete(name)));
}

async function seenVersions(versions: Cache): Promise<string[]> {
  const stored = await versions.match(VERSIONS_URL);
  if (stored === undefined) {
    return [];
  }
  const seen: unknown = await stored.json();
  if (!Array.isArray(seen) || !seen.every((version) => typeof version === "string")) {
    throw new Error(`the stored versions are invalid: ${JSON.stringify(seen)}`);
  }
  return seen;
}

function isSkipWaiting(data: unknown): data is SkipWaitingMessage {
  return (
    typeof data === "object" && data !== null && "type" in data && data.type === SKIP_WAITING_TYPE
  );
}
