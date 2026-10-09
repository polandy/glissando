# ADR-0013: Immich comes through the self-hosted Glissando; picked photos are stored locally

**Status:** accepted

## Context

Roadmap 3 (`dev-docs/SCOPE.md`): browse and pick albums and photos from an Immich server and use
Immich's face data for the automatic focus (ADR-0012). Glissando is local first: offline is the
primary use, and a server is never required for it. Whether the browser calls Immich directly or
through a server was to be decided by measurement.

Measured against a stock Immich v3.3.1 (the release `docker-compose.yml`, unchanged) on the LAN,
with Chromium driven by Playwright, 2026-10-09:

| Request from a page at another origin                       | Result                                       |
| ----------------------------------------------------------- | -------------------------------------------- |
| Preflight `OPTIONS /api/albums` (header `x-api-key`)        | 404 "Cannot OPTIONS" (Immich 1.120 the same) |
| `GET /api/albums` with an `Origin`                          | 200, no `Access-Control-*` header at all     |
| `fetch` with `x-api-key`, or with `?apiKey=` (no preflight) | `TypeError: Failed to fetch` (CORS)          |
| Same origin, a proxy path `/immich/` → Immich               | albums 200, preview 200, original 200        |

Immich has no CORS setting, and it is no OAuth provider: its OAuth only signs users in at an
identity provider, `/api/oauth/*` is as CORS-blocked as the rest, and the session it yields carries
the user's full rights. A typical self-hosted Immich is also reachable from outside only through
the owner's reverse proxy, often behind forward auth (Authelia) and an IP filter (CrowdSec), which
a browser-side client would have to pass as well.

What the feature needs, with the API key's permission:

- `GET /api/albums` (`album.read`): name, `assetCount`, `albumThumbnailAssetId`, date range.
- `POST /api/search/metadata` with `type: "IMAGE"`, `order: "desc"`, `size`, `page`
  (`asset.read`): all photos newest first, page by page until `nextPage` is `null`; with
  `albumIds` the same for one album. `GET /api/albums/{id}` no longer lists assets in v3.
- `GET /api/assets/{id}/thumbnail?size=thumbnail|preview` (`asset.view`): WebP ≈ 250 px short side;
  JPEG, long side ≤ 1440 px. `GET /api/assets/{id}/original` (`asset.download`): the file itself.
- `localDateTime` on every asset: the capture time as wall time with a `Z`, the convention
  `captureDate()` already uses for local files.
- `GET /api/faces?id=` (`face.read`): boxes in pixels of `imageWidth × imageHeight`, which is the
  preview's size in display orientation (checked with an EXIF-rotated photo). No score. A photo
  without faces and a photo Immich has not yet scanned both return `[]`; nothing the key may read
  tells them apart.
- A key with exactly `album.read, asset.read, asset.view, asset.download, face.read` is enough; a
  wrong key gets 401, a missing permission 403. `/api/server/version` needs no key.

## Decision

- **Immich is a feature of the self-hosted Glissando.** Glissando ships a container image: the
  same static build, served by a pinned Caddy, plus a route `/immich/` to the Immich server named
  in its environment (`IMMICH_URL`, e.g. `http://immich-server:2283`). It joins Immich's Docker
  network, so it reaches Immich directly, not through the public reverse proxy, Authelia or
  CrowdSec. The installation from a public static host stays offline-only and never shows Immich.
- **The API key lives only in that container** (`IMMICH_API_KEY` or a Docker secret file). Caddy
  sets it as `x-api-key` on the way to Immich and strips any `x-api-key` the browser sends. The
  browser never sees, stores or exports it; there is no key field in the app.
- **The route lets through only what Glissando reads**: `GET` on `/api/server/version`,
  `/api/albums`, `/api/assets/{id}/thumbnail`, `/api/assets/{id}/original`, `/api/faces`, and
  `POST /api/search/metadata`. Everything else answers 403. The key is created with the five read
  permissions above, so a hole in one layer is still read-only.
- **Access to Glissando is the access to the photos.** Whoever can open the self-hosted Glissando
  browses that key's library. Protection is the owner's proxy in front of Glissando (Authelia,
  basic auth) or a network boundary (LAN, Tailscale); the setup guide says so first.
- **The app discovers Immich, it is not configured.** On start (and when the pictures step opens),
  `GET ./immich/api/server/version` answering like Immich means "available". A 404 or HTML means
  "not set up" — the Immich source stays hidden. A 502 means the container cannot reach Immich; a
  401/403 from Immich means the server's key is wrong or lacks a permission. The app names the
  failure in one line; the cause in detail goes to the container's log, not to the browser. A redirect (the
  owner's forward auth after its session expired) means "sign in again" — a reload. The settings
  show this status read-only, with the remedy addressed to whoever runs the server.
- **Browsing**: "All photos" (newest first, grouped by day, the next page of 60 loaded as the
  list scrolls to its end) and "Albums". A selection spans both and several albums; videos are
  left out.
- **A picked photo is downloaded and stored like a local picture** (ADR-0003). The original goes
  through the same decode as a file from disk: a display rendition up to 3840 × 2160 and the
  480 px thumbnail, both made on the device. Immich's preview (≤ 1440 px) is too small for a 4K
  display rendition; it is the fallback only for an original the browser cannot decode (HEIC
  outside Safari). The capture date is Immich's `localDateTime`. Once added, playback, editing and
  export never ask Immich again, so the self-hosted install plays offline like any other.
- **One import, two sources.** `PictureImport` reads pictures from a source port instead of
  `File`s; local files and Immich assets are its two adapters. Ordering, downscaling, storage
  limits and error reporting stay in one place.
- **Immich's faces become the focus at import.** The largest face box (area; Immich gives no score),
  divided by `imageWidth`/`imageHeight`, is stored as `{kind: "subject"}` in the `focus` store
  (ADR-0012), so the on-device pass skips the picture. An empty face list stores nothing: it may
  mean "not scanned yet", and pico on the thumbnail is cheap, so the on-device pass decides.
- **Offline**: the Immich source is shown but disabled without a connection to the server; local
  pictures, playback and every stored slideshow are unaffected. The service worker never caches
  `/immich/`.

## Options weighed

- **The browser calls Immich at its own address** — fails on every stock install (no CORS,
  measured); behind Authelia and CrowdSec it would also have to pass forward auth and the IP
  filter; the key would sit in every browser.
- **Same origin through the owner's reverse proxy, key in the browser** — works (measured), no
  image to build, but every device needs the key typed in, the key is readable by any script on
  the origin, and the owner's proxy still routes Immich through Authelia.
- **OAuth against Immich** — Immich issues no tokens to other apps; its mobile sign-in flow is
  CORS-blocked as well and yields a session with full rights instead of five read permissions.
- **A Glissando server with its own logic** (a Node service) — could cache, sign in users or hold
  several keys, but is an application to write, test and patch for what a pinned Caddy route does.
  It comes when sync or TV control need a server; its own ADR then.
- **Referencing Immich photos instead of storing them** — no copy on the device, but every slideshow
  with Immich photos would need the server to play; offline is the primary use.
- **Storing `{kind: "none"}` for an empty face list** — saves one pico run per picture, but would
  freeze "no subject" for photos Immich simply has not scanned yet.

## Consequences

- Using Immich means self-hosting Glissando: one more service in Immich's `docker-compose.yml`,
  served over HTTPS by the owner's proxy like any other service (the PWA needs a secure context).
- One key is one Immich library: everyone using that Glissando sees the albums of that Immich
  user (and those shared with it). Separate libraries per person need sign-in, a later step.
- The repository builds and publishes a container image: the Caddy base pinned by digest, the image
  built in CI, its route rules tested against a fake upstream (allowed paths pass with the key
  set, others get 403, the browser's key header never reaches Immich).
- Immich photos cost device storage like local ones; a `.glissando` export contains them like local
  ones and plays anywhere without Immich.
- `PictureImport` changes from `File[]` to a source port; the local-file path keeps its behaviour
  and tests. App tests use a fake Immich client behind the port; the HTTP adapter is tested
  against recorded responses of the measured version. No test talks to a real server.
