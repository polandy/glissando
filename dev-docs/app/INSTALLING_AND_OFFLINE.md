# Installing and offline

The approved mockup: https://claude.ai/artifact/LBoKKSKY9qRJ3ntHCVaAVU. The service worker and
its update rule: ADR-0005; it leaves the Immich route (`immich/`) and the library route
(`api/library`, SERVER_LIBRARY.md) to the network, never caching their live data. Web app
manifest and icons in `public/`; the PNG icons come from `scripts/brand/icons.sh`.

- **The public installation**: every release (`release-please.yml`, job `pages`) publishes the
  build to GitHub Pages, https://polandy.github.io/glissando/ — a release, not every merge, so an
  installed app only offers released versions as updates. There is no server below it: Immich,
  server slideshows, share links and the TV remote never show (ADR-0013). It runs below a path,
  which E2E-053 covers with a second preview at `/glissando/`.

- **Where**: only the start screen's status bar. Left a dot and a status line, right at most one
  action — never a banner or a pop-up of our own. A waiting new version is the one exception to
  its quiet look (approved mockup:
  https://polandy.github.io/glissando-assets/mockups/version-and-update/, variant A).
- **Status line** (one of, first match):
  - _a new version waits_ (ADR-0005): the whole bar turns peach (`--gl-accent-tint`, taller,
    semibold), a peach dot with a halo, "New version ready · reload to switch, your slideshows
    stay as they are" (narrow: "New version ready"). The gear in the header carries a peach dot
    and is named "Settings · new version ready"; the settings repeat the offer at the version
    ([SETTINGS.md](SETTINGS.md)).
  - _insecure context_ (`http://<lan-ip>`, no service worker possible): lemon dot, "Online only ·
    no offline mode and no installing at this address" (narrow: "Online only · no offline
    mode"); action "Why?" opens a sheet: browsers allow offline use and installing only over a
    secure connection, slideshows stay stored on the device, the app itself needs the network to
    open; remedy: an `https://` address, or `localhost` on the device itself (at home e.g. Caddy
    or Tailscale).
  - _storage refused_ (the refusal was told, `persisted()` is still false, not running
    installed): lemon dot, "Offline · on this device, but not stored permanently" (narrow:
    "Offline · not stored permanently").
  - _running installed_ (display mode standalone, or iOS `navigator.standalone`): mint dot,
    "Installed · ready offline · stored on this device" (narrow: "Installed · ready offline").
  - otherwise mint dot, "Offline · stored on this device" (narrow: "Offline · on this device").
- **Action** (first match): the filled accent button "Reload now" while a new version waits;
  otherwise the install hint while installing is possible, the app is not running installed and
  the hint is not dismissed — or storage was refused, then it shows again and has no ✕.
- **Install hint**: a small button with the install icon plus a ✕ ("Hide hint", remembered per
  device). Where the browser offers an install prompt (`beforeinstallprompt`: Chrome, Edge,
  Samsung Internet) it reads "Install app" and opens that prompt; accepted, the app counts as
  installed. Elsewhere it reads "Install as app" and opens a sheet with the steps of that
  browser (`pwa/install-guide.ts`, from the user agent):
  - iPhone and iPad (every iOS browser): Share → "Add to Home Screen" → "Add".
  - Safari 17 or newer on the Mac: menu "File" → "Add to Dock…" → "Add".
  - Firefox on Android: menu ⋮ → "Add to Home screen" → "Add".
  - Firefox on the computer: titled "Firefox does not install apps"; Glissando still runs
    offline here at the same address; as its own window: open it in Chrome, Edge or Safari.
  - Chromium before its prompt arrived, Safari before 17 on the Mac, and any other browser: no
    hint.
- **Persistent storage refused** also offers "Install as app" in its dialog (same action as the
  hint) while installing is possible.
- **Running installed with a told refusal**: at startup storage is requested again, since
  browsers grant it to installed apps without asking.
- **Updates**: "Reload now" (or "Reload to update" in the settings) asks the waiting version to take over, then this tab reloads into the
  new version; other tabs keep running their version until their next start.

- **The demo slideshow** (approved mockup:
  https://polandy.github.io/glissando-assets/mockups/demo-slideshow/): on the public installation
  only (`GLISSANDO_PUBLIC_INSTALL`, never on the self-hosted Docker image), an empty library shows
  a card, "See Glissando in action" over "Load demo slideshow →" next to a play-icon cover, above
  "New slideshow" and "Open .glissando file"; it hides once the library holds a slideshow and
  reappears once it is empty again. A tap downloads `GLISSANDO_DEMO_URL`
  (`build/demo-slideshow-config.ts`; defaults to the file published at `glissando-assets/demo/`,
  overridable for a LAN preview) and hands the bytes to the same import path a picked `.glissando`
  file takes (`app/start/demo-slideshow-flow.ts`). While loading, the card's action line carries
  progress, "Loading demo… 12 of 31 MB", with a hairline bar along the card's bottom edge
  (indeterminate until the download's `Content-Length` is known). Offline, the card is disabled
  (dimmed) with the hint "Needs a connection — once loaded, the demo works offline." A failed
  download toasts "Couldn't load the demo — try again" and returns the card to idle. Credit for
  the demo's pictures and music lives in the file's own content.

- **Double-click on a .glissando file** (`glissando-file/launched-files.ts`): the installed app
  registers as the program for `.glissando` (manifest `file_handlers`, type
  `application/x-glissando`, the app icon as file icon) — Chromium on the desktop only. Every
  double-clicked file opens in a new app window (`launch_handler` `navigate-new`, one window per
  file), so a running window, e.g. one playing a slideshow, stays as it is. The new window starts
  in the library and opens the file from there exactly as "Open file" does: overlay, toasts,
  notices, every format version; opening the same file again makes another copy ("Opened as …").
  Browsers without file handlers (Firefox, Safari, phones) show no trace of it; "Open file"
  stays the way there. The registration comes with installing, and updates with the manifest
  like any other file of a new version (ADR-0005).
