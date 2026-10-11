# Code

- `src/html-export/`: pure logic and ports.
  - `plan.ts`: sizes, fitted size, estimate, file name.
  - `page.ts`: the page as text from its parts (slideshow JSON, media blocks, player script,
    font, copy), with `<` escaped in JSON. The player script goes in unchanged:
    `inline-script.ts` refuses one holding `</script` or `<!--`, at build time
    (`build/export-player-bundle.ts`) and again when the page is written, since no escape is
    safe everywhere in JavaScript.
  - `export-page.ts`: the run (downscale each picture through a port, progress, cancel, write the
    parts to a sink in order, so a picked file is streamed rather than held whole). A medium is
    read, encoded and written in slices of `MEDIA_CHUNK_BYTES` (768 KiB), so not even a song
    is ever held whole as a string. The cancel is checked before each picture, each slice and
    closing the page.
  - `page-contract.ts`: the block ids, keys, copy keys and states the page's script shares.
  - Ports: `PictureScaler`, `PageSink`, `PlayerAsset`.
- `src/html-export/browser/`: the scaler (`createImageBitmap` + `OffscreenCanvas`, shared with
  import's `encodeJpeg`), the sinks (file picker writable, in-memory Blob), the player asset.
- `src/export-player/`: the page's script, in plain TypeScript, never Svelte. `main.ts` reads
  the data blocks (`page-data.ts`); `page-player.ts` is the part the share page
  (`dev-docs/SHARE_LINK.md`) shares: it creates the player from a `PlayablePage` (the slideshow
  and its `openPicture`) and runs the start card, controls and end card, with hooks for what a
  page does differently (what Play does, a picture that failed, the player waiting for one).
  `show` replaces the player, so a page can play a changed slideshow on. A Vite plugin
  (`build/export-player-plugin.ts`, modelled on the service worker plugin) bundles it into one
  self-contained script with the decode worker inline (`buildPlayerPage`, which the share page's
  plugin uses too). The app imports it as a virtual module and loads it on the first export, and
  the service worker precaches it.
- `src/export-player/` imports only `src/player/`, `src/html-export/page-contract.ts`,
  `src/html-export/base64.ts` (the media blocks' encoding, the other half of that contract) and
  `src/ui-kit/` (icons, scheduler, controls visibility, caption inset, fullscreen), which the app
  shares (app/WIRING.md).
- `src/app/html-export/` drives the sheet: `html-export-session.ts` (the flow over the ports and
  states in `html-export-state.ts`, unit-tested with fakes), `page-copy.ts` (the page's words
  from the catalogue, `htmlPage.*`), `slideshow-html-export.ts` (estimate and run for the stored
  slideshow) and `browser-html-export-device.ts` (picker or memory destination, share, download,
  new tab; wired by `main.ts`). The sheet lives in
  `src/app/screens/slideshow/HtmlExportSheet.svelte` with its states' parts in
  `screens/slideshow/html-export/` and the parts shared with the video sheet in
  `screens/slideshow/export-sheet/`.
- Tests: units for plan, page and run against fakes; a browser test builds a page from a
  generated slideshow, opens it from a `blob:` URL in each engine and plays it to `ended`; E2E-033
  runs the sheet from the info panel to "done" at Small, downloads the file, opens it from
  `file://`, presses Play and waits for the player to report playing. All test pictures are
  generated or public domain.
