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

- [ ] `src/app/screens/slideshow-screen-strip-marks.browser.test.ts:39-40` — `toBeDefined()` on a `querySelector` result cannot fail; `expect.poll` on `:hover` is polling. Fix: `not.toBeNull()`, await the hover event.
- [ ] `src/app/screens/slideshow/{Look,Mood,Transitions,PortraitPictures}Sheet.svelte` — Each reimplements radio arrow-key handling although `components/RadioGroup.svelte` exists. Fix: use it.
- [ ] `src/app/screens/slideshow/MoreMenu.svelte:103,131` — `role="menu"` without arrow navigation; Tab leaves it open; double `<hr>` when `storage` is null. Fix: arrow keys; render the separator only before a non-empty group.
- [ ] `src/app/screens/slideshow/export-sheet/ExportFailure.svelte:37-38` — `as ClipFreeKey` / `as ClipKey` casts hide the title↔clip relation. Fix: a discriminated union.
- [ ] `src/app/screens/slideshow/card-sheet/CardTintPicker.svelte` vs `CardEntrancePicker.svelte` — Near-identical 72-line files. Fix: one `ChipRow.svelte`.
- [ ] `CardTintPicker.svelte:59,66`, `CardEntrancePicker.svelte:59,66`, `PlayPreview.svelte:64`, `CardStylePicker.svelte:89`, `FocusSearchLine.svelte:50,56`, `PlaceholderTile.svelte:45,53`, `PanelTile.svelte:114` — Raw `font-weight`, `font-size: 22px` and 1–3 px radii instead of tokens. Fix: tokens (add a hairline radius token if needed).
- [ ] `src/app/screens/slideshow/card-sheet/CardBackgroundPicker.svelte:96` — Magic `"plum"` duplicates `FALLBACK_CARD_SWATCH`. Fix: import it.
- [ ] `src/app/screens/SlideshowScreen.svelte:96` — `$effect` writes `selection` which it reads; converges only by object identity. Fix: prune at the mutation sites or derive.
- [ ] `src/app/screens/slideshow-screen-harness.ts:227,241` and `slideshow-route-harness.ts`, `strip-drag-rig.ts`, `picture-editor-route-harness.ts` — `card as StoredCard` cast, module-level mutable `destroy`, picture fixture duplicated four times. Fix: one typed fixture module.

### Tooling, docs and tests

- [ ] `dev-docs/library/SAMPLE_MUSIC.md:36` — Points to `build/demo-slideshow-config.ts`, which does not exist. Fix: drop or repoint.
- [ ] `dev-docs/UX_BACKLOG.md` — A finished, dated review record among current specs. Fix: delete it (git holds it) or move the method notes to `scripts/ux-tour/README.md`.
- [ ] `dev-docs/player/VIDEO_SLIDES.md:23` — "no longer hidden" narrates history. Fix: state the current behaviour.
- [ ] `.github/workflows/ci.yml:44,58,64`, `release-please.yml` — No `timeout-minutes`; a hung job holds a runner 6 h. Fix: per-job timeouts.
- [ ] `vite.config.ts:13,68` — The e2e-only `tvStreamPlugin` runs in every `vite preview`, incl. the LAN preview, with an unbounded push buffer. Fix: register it only from the Playwright webServer command.
- [ ] `scripts/brand/webfonts.py:105` — Licence files are fetched without a hash check. Fix: `license_sha256` per `FontSource`.
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
