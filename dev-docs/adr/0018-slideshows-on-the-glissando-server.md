# ADR-0018: Slideshows on the Glissando server link Immich photos; copies, not sync

**Status:** accepted

## Context

The self-hosted Glissando (ADR-0013) lets the app pick photos from Immich, and every picked photo
is downloaded and stored on the device. A household with its photos in Immich wants slideshows
that every device at home can play and edit, without each device holding a copy of every photo.
ADR-0013 left this open: a server with its own logic comes when sync needs one, with its own ADR.

Constraints: offline is the primary use (`dev-docs/SCOPE.md`); the server never renders; the
Immich key stays in the container and is read-only; one Glissando is one shared library (no user
accounts, ADR-0013); the app reaches the server over plain HTTP on the LAN as well as over HTTPS.

## Decision

- **The server stores slideshows, never pictures.** A server slideshow is the `.glissando`
  manifest's `slideshow` (`dev-docs/LIBRARY.md`) with every picture an Immich asset id instead of
  a file. Its music is the one file it keeps, because Immich holds no audio. A device picture
  cannot go into a server slideshow: "Save on the server" lists such pictures and offers to save
  without them.
- **A small service in the same container.** A Node program (the runtime pinned like the build's,
  bundled into one file at image build so it shares the app's modules) listens on loopback; Caddy routes
  `/api/library/…` to it and keeps the Immich route unchanged. Storage is Node's built-in
  `node:sqlite` in a volume (`GLISSANDO_DATA_DIR`): one file, transactions, no new dependency.
  Without the volume the server part is off and the app looks as it does today.
- **The server validates with the app's validator.** The manifest checks of `src/glissando-file/`
  run on the server too, so a document the app could not open is refused at the door (400 with the
  path and value).
- **Every write names the revision it edits.** A slideshow carries a revision; `PUT` with
  `If-Match` replaces it only if that is still the current one, else 412 with the current
  document. The app applies its edits one at a time (as on the device), so a conflict loses at
  most one edit: the app reloads the newest version and says "Changed on another device".
- **Playback fetches originals and downscales on the device.** The player asks a picture source
  for bytes: for a server picture it fetches Immich's original through `/immich/` and makes the
  display rendition with the import's decode, a few pictures ahead (ADR-0014). Thumbnails are
  Immich's. Nothing of it is stored; the browser's HTTP cache may keep what it fetched. A photo
  Immich no longer has is shown as missing and skipped when playing.
- **Copies, not sync.** "Keep a copy on this device" downloads a server slideshow into an ordinary
  device slideshow; "Save on the server" copies a device slideshow of Immich photos to the server.
  The copies are independent afterwards.
- **Online only.** A server slideshow needs the server: offline its card is greyed out. The copy
  on the device is the way to take one along.
- **Shown only with Immich.** The choice where a new slideshow lives, and the server section of
  the library, appear only when Immich is available through this Glissando and its library storage
  is on. Offline, existing server slideshows stay listed, greyed out.

## Options weighed

- **Upload device pictures to the server** (their display renditions) — any slideshow could be
  saved, but the server becomes a picture store to size, back up and garbage-collect.
- **Upload device pictures into Immich** — needs `asset.upload`, so the key stops being read-only.
- **Keep server slideshows available offline** (a per-device pin caching the renditions) — cache
  state, eviction and storage handling on every device for what an explicit copy already gives.
- **Edit offline and merge later** — real sync: a queue, merge rules per field and their tests,
  for a household that edits at home anyway.
- **Immich's preview (≤ 1440 px) for playback** — lighter, but soft on a 4K TV; the device
  slideshow's quality is the bar.
- **JSON files instead of SQLite** — readable, but atomic multi-record writes (slideshow + music)
  and revision checks would be hand-built; `node:sqlite` ships with the runtime.
- **A separate container for the service** — cleaner process model, but a second service in the
  owner's `docker-compose.yml` and a network path between the two to secure.

## Consequences

- The image carries Node besides Caddy; the entrypoint supervises both and stops the container
  when either exits. Its route test grows a case per new route.
- Access to Glissando is now also write access to the shared library: anyone who opens it can
  change or delete a server slideshow (confirmed in the app). The setup guide says so and
  recommends backing up the volume.
- Playing a server slideshow moves every original over the LAN each time; a slow Wi-Fi shows as
  a longer wait before the first picture, not as a jump (pictures are prepared ahead).
- The app's store is a port with two adapters (IndexedDB, server); the editors and exports do not
  know which one they talk to. Only the player knows where a slideshow lives, to skip a picture
  Immich no longer has.
