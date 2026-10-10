# Web page export

The slideshow as one self-contained `.html` file: pictures scaled down, the music, the caption
font and Glissando's player engine inside it. It plays offline in a browser, without Glissando,
at a tenth of the MP4's size (ADR-0017). Approved mockup:
https://polandy.github.io/glissando-assets/mockups/html-export/.

## Sizes

| Size (id)      | Fits within | Label (de / en)                                               |
| -------------- | ----------- | ------------------------------------------------------------- |
| Klein / Small  | 1280 × 720  | Zum Verschicken in einer Nachricht / For sending in a message |
| Scharf / Sharp | 1920 × 1080 | Für Rechner und Tablet / For a computer or tablet             |
| 4K             | 3840 × 2160 | Für den Fernseher / For the TV                                |

- Each picture is fitted within the size (`fitWithin`, long and short edge, never scaled up) and
  encoded as JPEG q 0.85. The stored display picture already fits within 3840 × 2160, so 4K takes
  its bytes as they are, and so does any size the stored picture already fits.
- The default is Small.
- The estimate beside a size is
  `(Σ picture bytes × min(1, fitted pixels / stored pixels) + music bytes + page bytes) × 4 / 3`,
  shown as "ca. 16 MB". "Page bytes" are the player bundle, font and markup.
- With 4K selected, a lemon note shows: "Zu groß für eine E-Mail. …"

## The page

- `<!doctype html>`, `lang` and the start card's copy in the app's language at export time, and
  `<title>` set to the slideshow's title. CSS and the player script are inline, and the caption
  font is an `@font-face` with a `data:` URL. Nothing loads from outside the file, and the page
  sets a CSP `default-src 'none'` that allows only inline script, inline style and `data:`/`blob:`
  media.
- **Data**: the slideshow JSON (as composed for the player, `parseSlideshow` format) sits in
  `<script type="application/json" id="slideshow">`. Each picture's `image.src` is a key `p<n>`,
  the music's `src` the key `music`. Each medium is a
  `<script type="application/octet-stream" id="<key>" data-type="<mime>">` holding its base64. The
  page's `openPicture(key)` decodes a block into a Blob on demand, so only the pictures the player
  holds are ever unpacked. The music becomes one `blob:` URL when the page starts. The page's
  words sit in `<script type="application/json" id="copy">`, the start card's summary already
  formatted at export time, so the page itself formats nothing but the time.
- **State**: `<html data-state>` is `start`, `playing`, `paused`, `ended` or `error`, so a test
  waits on a mutation rather than on time.
- **The player** is the engine's own (`createBrowserPlayer` with WebGL2, else the DOM fallback),
  built as a standalone bundle with the decode worker inlined. Where the worker fails a picture
  the main thread decodes (WebKit's worker reads no Blob from `file://`), or cannot start, the
  page decodes on the main thread from then on (`mainThreadDecodeFallback`). Trim, fades, captions and each picture's own
  Ken Burns, duration and transition are exactly the app's.
- **Start card**: the first picture behind a dark veil, eyebrow "Diashow", the title, "50 Bilder ·
  4:10 · mit Musik" (or "ohne Musik"), a round peach Play button, and at the bottom "Erstellt mit
  Glissando · läuft offline". Play is the user gesture that unlocks the music (PLAYER.md).
- **Playing**: the player full-bleed. Controls are laid over the bottom: play/pause, time
  "0:12 / 4:10", a timeline (click or drag to seek, arrow keys ±5 s), mute, and full screen where
  `requestFullscreen` exists. They hide 2.5 s after the last pointer move, tap or key while
  playing, and show while paused. `captionInset` follows them as in the app. Keys: Space or K
  play/pause, ←/→ seek ±5 s, M mute, F full screen.
- **End card**: the title and "Nochmal abspielen".
- **Error**: a player `error` shows "Diese Diashow lässt sich hier nicht abspielen." with the
  error's name, over the start card.
- `<noscript>`: "Diese Diashow braucht JavaScript. Öffne die Datei in einem Browser wie Safari,
  Chrome oder Firefox."
- File name `<title>.html`, with characters that file systems refuse replaced by `-` (the same rule
  as `.glissando` files).

## Sheet

The info panel's "Speichern als" row holds "Video" (film icon) and "Webseite" (page icon), side by
side under "Abspielen"; their accessible names are "Als Video sichern" and "Als Webseite sichern".
"Webseite" opens `HtmlExportSheet`: a dialog on desktop, a bottom sheet
below 720 px. Its states follow the video sheet's (VIDEO_EXPORT.md):

| State   | Content                                                                                                                                                                                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| choose  | Title "Als Webseite sichern", subtitle "<title> · <duration> · mit Musik"; three size radios with the estimate; a bar comparing the estimate with the 1080p video's; chips `eine .html-Datei · läuft offline · Musik, Untertitel, Ken Burns`; the 4K note; the hint "Läuft in jedem aktuellen Browser …"; Abbrechen / Webseite erstellen |
| running | One thumbnail per picture, lit once that picture is done; a mint progress bar; "Bild 12 von 50"; the bytes so far; only "Abbrechen"                                                                                                                                                                                                      |
| done    | File row (first picture, name, size, duration, size id). The video sheet's targets (picker: "Gespeichert" + "Fertig"; share: "Teilen …"; else "Herunterladen") plus "Öffnen", which opens the page in a new tab                                                                                                                          |
| failed  | Coral note with the error; "Schließen"                                                                                                                                                                                                                                                                                                   |

- **Estimate**: each stored display picture's byte count is its Blob's size, which IndexedDB
  knows without reading the bytes; the music's likewise. The page bytes are the player bundle's
  (`playerBundleBytes`), so opening the sheet loads the bundle, which also fetches it before the
  start. Until both are known the sizes show no estimate; if either fails, the sheet shows
  failed. The comparison's full bar is the 1080p video's estimate (VIDEO_EXPORT.md).
- The done file row's facts are "16 MB · 4:10 · 1280 px" (the size's long edge).
- **Target**: as the video export: with `showSaveFilePicker`, "Webseite erstellen" opens it (type
  `text/html`, suggested name `<title>.html`), and dismissing it returns to choose. Elsewhere the
  page is built as a Blob in memory and handed to share or download.
- "Öffnen" opens the finished file through a `blob:` URL in a new tab. A picked file is read
  back from disk (`FileSystemFileHandle.getFile()`), a page built in memory is its Blob, so the
  page is never held twice. The URL is revoked when the sheet closes; a tab that has loaded the
  page keeps it.
- "Abbrechen" stops before the next picture (an `AbortSignal`), and a picked file is truncated.
  Esc and ✕ cancel while running; a tap on the scrim closes the sheet only in choose and failed.
  Closed, focus goes back to "Webseite".

## Code

- `src/html-export/`: pure logic and ports.
  - `plan.ts`: sizes, fitted size, estimate, file name.
  - `page.ts`: the page as text from its parts (slideshow JSON, media blocks, player script,
    font, copy), with escaping of `</script` in JSON.
  - `export-page.ts`: the run (downscale each picture through a port, progress, cancel, write the
    parts to a sink in order, so a picked file is streamed rather than held whole).
  - `page-contract.ts`: the block ids, keys, copy keys and states the page's script shares.
  - Ports: `PictureScaler`, `PageSink`, `PlayerAsset`.
- `src/html-export/browser/`: the scaler (`createImageBitmap` + `OffscreenCanvas`, shared with
  import's `encodeJpeg`), the sinks (file picker writable, in-memory Blob), the player asset.
- `src/export-player/`: the page's script. It reads the data blocks, creates the player, and
  runs the start card, controls and end card in plain TypeScript, never Svelte. A Vite plugin
  (`build/export-player-plugin.ts`, modelled on the service worker plugin) bundles it into one
  self-contained script with the decode worker inline. The app imports it as a virtual module and
  loads it on the first export, and the service worker precaches it.
- `src/export-player/` imports only `src/player/`, `src/html-export/page-contract.ts` and
  `src/ui-kit/` (icons, scheduler, controls visibility, caption inset, fullscreen), which the app
  shares (APP.md, Wiring).
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
