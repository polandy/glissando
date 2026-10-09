# ADR-0011: An app shell in index.html, styled by the linked stylesheet; one bundle

**Status:** accepted

## Context

Until the app had rendered, the page was blank (white, even in dark mode). Measured with
`scripts/measure-first-paint.mjs` (Chromium, median of 5; "phone" = 4× CPU slowdown,
30 Mbit/s, 20 ms latency, over the LAN address):

| Setup                     | Requests | JS on the wire | First paint  | App rendered |
| ------------------------- | -------- | -------------- | ------------ | ------------ |
| Dev server, phone         | 250      | 3.4 MB         | 1,636 ms     | 1,692 ms     |
| Build, phone, first visit | 2        | 97 KB          | 68 ms, blank | 190 ms       |
| Build, phone, repeat      | 2        | cached         | 60 ms, blank | 102 ms       |

The long white page comes from the dev server's 250 unbundled modules; the build is fast, but
blank until its script has run. Opening IndexedDB takes under 10 ms, the fonts load after the
first render and the service worker registers after it, so none of them holds up the first paint.

## Decision

`index.html` carries an **app shell**: the header bar with the brand, the logo where the start
screen has its mark, and the status strip, in the theme's tokens. It is painted before any script
runs and handed over once the app has mounted (`src/app/shell/app-shell.ts`): it fades out over
the app and is removed when the fade ends, or at once with reduced motion.

- **Styled by the app's stylesheet, linked in the head.** `tokens.css`, `base.css` and
  `app-shell.css` are `<link>`ed by `index.html` instead of imported by `main.ts`; the build
  bundles them with the components' CSS into the one render-blocking stylesheet it already had,
  and the dev server serves them before any module runs.
- **A pinned theme is applied by an inline script** in the head
  (`build/pinned-theme-script.ts`), generated from `settings/theme.ts`'s key and values, so the
  shell never shows the wrong theme.
- **One bundle.** The editors and the player are not split into lazily loaded chunks.

Afterwards the shell paints in 80–85 ms on the phone profile, on the dev server too.

## Options weighed

- _Inline the critical CSS_ (tokens and shell styles in a `<style>` in `index.html`) — rejected:
  it saves one round trip only on a first visit (the service worker serves the stylesheet from
  then on), while the token values would be generated into the HTML or kept twice.
- _Split the editors and the player into lazy chunks_ — rejected: the whole bundle is 97 KB
  compressed and its scripts are done 142 ms after navigation on the phone profile; splitting
  would add requests and a loading state per screen for a few tens of milliseconds.
- _A shell with only the logo_, or _only the header and status strip_ — the owner chose the
  full frame in the mockup: with only the logo the header pops in at the handover, and with an
  empty middle the page can look broken.

## Consequences

- The shell's bar, strip and logo position mirror `Header.svelte`, `StatusBar.svelte` and the
  start screen by hand; a change there needs the same change in `app-shell.css`.
- If the app fails before it mounts, the shell stays on screen instead of a blank page.
