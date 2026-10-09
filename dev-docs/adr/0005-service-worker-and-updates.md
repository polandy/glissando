# ADR-0005: A hand-written precaching service worker; updates wait for a quiet moment

**Status:** accepted

## Context

Glissando must run fully offline after one load, also after a restart without a network
(`dev-docs/SCOPE.md`, PWA). That needs a service worker that caches the whole app. A new version
must arrive without interrupting a slideshow that is playing or an import in progress, in this
tab or in another one. Every dependency is pinned and weighed (`CODING_PRINCIPLES.md` §5).

## Decision

- **Our own service worker, built by a small Vite plugin.** `src/sw/` is a second build entry
  emitted as `sw.js` at the app root. At the end of the build the plugin writes the list of every
  emitted file (and every `public/` file) into it, plus a version derived from those files'
  contents. The service worker imports nothing, so the emitted file is a plain classic script
  that every supported browser registers.
- **Cache first, per version.** Installing caches the whole list in a cache named after the
  version; the app's own requests are answered from the current version's cache, navigations
  with the cached file they name (the third-party licences) or else its `index.html`; a miss looks in the previous version's cache, so a tab still running
  that version keeps finding its files; only what neither holds goes to the network, as does
  every request to another origin and every request under the app's `immich/` route, which is
  never cached (ADR-0013). Activating deletes every cache except the current and the
  previous version. Cache names carry the worker's scope, so installs below different paths of
  one host never touch each other's caches.
- **No automatic takeover.** A new version installs in the background and waits (no
  `skipWaiting` on install). It takes over by itself once every Glissando window is closed, so
  the next launch runs it. Meanwhile the start screen's footer offers "Reload"; only that click
  asks the waiting worker to take over, and only the tab that clicked reloads. The footer exists
  only on the start screen, so the offer never shows during playback or an import.
- **Only in a secure context and only in the production build.** Over `http://<lan-ip>` the
  browser offers no service worker; the app stays a web app and says so. The dev server
  registers none, so code changes are never served from a cache.
- **Relative paths.** The build uses a relative base, the manifest's `start_url` and `scope` are
  `.`, and the worker is registered at `./sw.js`, so the same build installs from any static
  HTTPS host, at its root or below a path.

## Options weighed

- _`vite-plugin-pwa` (Workbox)_ — complete and well known; rejected because it pulls Workbox's
  build tooling (dozens of transitive packages) for what is a precache list and a cache-first
  fetch handler, and its generated worker is harder to test than our own pure functions.
- _Network first for `index.html`_ — always the newest version when online; rejected because it
  replaces a running version in the middle of a session on any reload and makes a slow network
  delay every start, while the app is meant to start offline-first.
- _Take over at once (`skipWaiting` + `clients.claim` on install)_ — updates land fastest;
  rejected because a running tab would then fetch files of a version it was not built with.
- _Reload by itself when the start screen is idle_ — no click needed; rejected by the owner: the
  page would jump unexpectedly.

## Consequences

- The plugin fails the build if the service worker entry imports anything, so it stays a classic
  script.
- A tab that stays open for days runs the old version until the user reloads or closes it; the
  footer tells them.
- Keeping one previous version doubles the app's cache for a while — a few hundred kilobytes,
  small next to the media in IndexedDB.
- End-to-end cases block service workers by default, so a cached app never hides a change; the
  PWA case opts in.
