# The page

- `<!doctype html>`, `lang` and the start card's copy in the app's language at export time, and
  `<title>` set to the slideshow's title. CSS and the player script are inline, and the caption
  font is an `@font-face` with a `data:` URL, as is every font a card on the slideshow uses beyond
  it (ADR-0032: `cardFontFilesUsedBy` picks only the fonts the slideshow's cards need). Nothing
  loads from outside the file, and the page sets a CSP `default-src 'none'` that allows only
  inline script, inline style and `data:`/`blob:` media.
- **Data**: the slideshow JSON (as composed for the player, `parseSlideshow` format) sits in
  `<script type="application/json" id="slideshow">`. Each picture's `image.src` is a key `p<n>`,
  every track's `src` the key `s<n>` of its song: each song the composed JSON plays is embedded
  once, numbered in playlist order, and a song the slideshow never reaches is left out. Each
  medium is a `<script type="application/octet-stream" id="<key>" data-type="<mime>">` holding its
  base64. The page's `openPicture(key)` decodes a block into a Blob on demand, so only the
  pictures the player holds are ever unpacked. A video slide's `video.src` is a key `v<n>`: each
  distinct clip the slideshow plays is embedded once, whole and in its own type, numbered in slide
  order after the songs, and the slide's poster stays a normal `p<n>` picture. The page's
  `readVideo(key)` decodes the clip's block when the slide opens and keeps the last two decoded
  clips, so a replay does not decode base64 again; the clip plays with sound after the first
  gesture (VIDEO_SLIDES.md). The mute button mutes the music only, so a slideshow whose only sound
  is a clip's shows none. Each song becomes one `blob:` URL when the page
  starts, shared by its tracks, and the page plays every track as the app does (PLAYER.md). The page's
  words sit in `<script type="application/json" id="copy">`, the start card's summary already
  formatted at export time, so the page itself formats nothing but the time.
- **State**: `<html data-state>` is `loading`, `start`, `playing`, `paused`, `ended` or `error`,
  so a test waits on a mutation rather than on time. `loading` already shows the start card;
  `start` follows once Play is wired, so a click on Play after `start` is always heard.
- **The player** is the engine's own (`createBrowserPlayer` with WebGL2, else the DOM fallback),
  built as a standalone bundle with the decode worker inlined. Where the worker fails a picture
  the main thread decodes (WebKit's worker reads no Blob from `file://`), or cannot start, the
  page decodes on the main thread from then on (`mainThreadDecodeFallback`). Trim, fades,
  captions and each picture's own Ken Burns, duration and transition are exactly the app's.
- **Start card**: the first picture behind a dark veil, eyebrow "Diashow", the title, "50 Bilder ·
  4:10 · mit Musik" (or "ohne Musik"), a round peach Play button, and at the bottom "Erstellt mit
  Glissando · läuft offline". Play is the user gesture that unlocks the music (PLAYER.md).
- **Playing**: the player full-bleed. Controls are laid over the bottom: play/pause, time
  "0:12 / 4:10", a timeline, mute where the slideshow has music, and full screen where
  `requestFullscreen` exists. The timeline is a focusable `role="slider"` (`aria-valuenow` and
  `aria-valuetext` in seconds and as "0:12 / 4:10"): click or drag to seek, and when focused it
  handles ←/→ (±5 s) itself. The controls hide 2.5 s after the last pointer move, tap or key while
  playing, and show while paused. `captionInset` follows them as in the app. Keys: Space or K
  play/pause, ←/→ seek ±5 s, M mute (with music only), F full screen (where it exists). Keys are
  ignored while the start, end or error card shows (`pageKeyAction`).
- **End card**: the title and "Nochmal abspielen".
- **Error**: a player `error` shows "Diese Diashow lässt sich hier nicht abspielen." with the
  error's name, over the start card.
- `<noscript>`: "Diese Diashow braucht JavaScript. Öffne die Datei in einem Browser wie Safari,
  Chrome oder Firefox."
- File name `<title>.html`, with characters that file systems refuse replaced by `-` (the same rule
  as `.glissando` files).
