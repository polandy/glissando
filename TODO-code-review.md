# Code review findings — todo

Full-repo review of `main` at cccadb7 (2026-11-03), ten areas read against
`dev-docs/CODING_PRINCIPLES.md` and `dev-docs/WORKFLOW.md`. One line per item, severity first
(HIGH = bug, data loss or security; MED = likely bug or a principle violation that costs
maintainability; LOW = cleanup). A finished item is deleted; the file goes when it is empty.

Each fix starts with the failing test the item names or implies (WORKFLOW.md, Testing).

## MED

### Server, sync and TV

### Player

### Library and file format

### Import and Immich

### Exports, share and PWA

### App shell, routing and editors

### Tooling and tests

## LOW

### Server, sync and TV

### Player

### Library and file format

- [ ] `src/library/indexeddb-store.ts:288-291`, `src/main.ts:121` — A `VersionError` (newer DB) and a `versionchange` close give a blank app or "unexpected error" toasts with no reload prompt; no `onblocked`. Fix: a "reload / newer version open" screen; reload on `versionchange`.

### Exports, share and PWA

### App shell, routing and editors

### Screens

### Tooling, docs and tests

- [ ] `scripts/serve-server-library.sh:16` — A hard-coded port list that the live `ss` check already covers. Fix: drop it.
- [ ] `scripts/ci-failures.sh:5` — Takes the latest run whatever its state. Fix: `--status failure`.
- [ ] `e2e/touch-reorder.spec.ts:90` — Waits out the hold timer on the real clock. Fix: `page.clock.install()` + `runFor(HOLD_MS)`.
- [ ] `src/player/browser/open-video.test.ts:123` — Named "never fetches" but asserts one read and checks no decode. Fix: rename to what it checks.
- [ ] 27 `as unknown as` casts in tests (`video-playback.test.ts:166`, `open-video.test.ts`, lifecycle/follow/fallback tests) force fakes into DOM types. Fix: a narrow `VideoElementPort` the fakes implement.
- [ ] `slideshow-screen-selection-rows.browser.test.ts:85-90`, `slideshow-screen-labelled-bar.browser.test.ts:195-199` — `if (label !== null) expect(...)` skips the check silently. Fix: assert the expected labelled set, then check each.
- [ ] `src/video-export/browser/run-video-export.browser.test.ts:204` — `if (browser !== "webkit") expect(...)` hides a skipped check. Fix: own case with `it.skipIf`.

## Not reviewed

Vendored `src/import/libav`, `src/focus/onnx` models and `pico`, `compose/compose-slideshow` and chapters, `loudness/measure-loudness`, `beats/onset-envelope`/`tempo`/`fft`, most Svelte components outside `screens/` and the editors, `deploy/test-image*.sh` and the fake-Immich scripts, the bodies of the 15 largest unit tests.

## Accepted

- `package-lock.json` — `npm audit` (dev only, low): `deepmerge` (GHSA-gcqx-w48m-w2h4) via `@sveltejs/vite-plugin-svelte`. Accepted: unreachable, the plugin merges only our own `svelte.config.js`. Revisit when vite-plugin-svelte drops or patches it; never `audit fix --force`.
