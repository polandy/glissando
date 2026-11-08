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

### Music, composition and focus

### Exports, share and PWA

### App shell, routing and editors

### Tooling and tests

## LOW

### Server, sync and TV

### Player

### Library and file format

- [ ] `src/library/indexeddb-store.ts:288-291`, `src/main.ts:121` — A `VersionError` (newer DB) and a `versionchange` close give a blank app or "unexpected error" toasts with no reload prompt; no `onblocked`. Fix: a "reload / newer version open" screen; reload on `versionchange`.

### Import and Immich

- [ ] `src/import/flac-samples.ts:70`, `browser/libav-flac.ts` — `channels`/`frameSize` not validated; a frame length of 0 never progresses. Fix: validate in the constructor and `startEncoding`.
- [ ] `src/import/picture-import.ts:126` — `stop()` records pick ids with nothing in flight, never removed. Fix: add only when a file is in flight, or clear on drain.
- [ ] `src/app/import/import-session.ts:49` — `#songReads` entries are never deleted after success; `probeMusic` has no abort, so one stalled probe blocks the queue. Fix: delete settled entries; give the probe a signal.

### Music, composition and focus

- [ ] `src/compose/snap-to-beats.ts:84-86` — Docstring says "one beat", the code and ADR-0021 use half a beat. Fix: correct the comment.
- [ ] `src/compose/snap-to-beats.ts:111` — `oneBeatMs` averages the whole playlist incl. gaps and mixed tempi. Fix: the local beat interval around the cut.
- [ ] `src/compose/playlist.ts:94-117` — `repeatedPlaylist` grows quadratically; a very short song under a long show stalls compose. Fix: place once and extend by the period.
- [ ] `src/app/beats/playlist-beats.ts:40-44`, `src/app/loudness/playlist-loudness.ts` — The first replayed status is discarded because the map entry is set after subscribing. Fix: set the entry first.
- [ ] `src/focus/focus-worker.ts:16` — A `postMessage` throw is an unhandled rejection and the request never settles. Fix: catch and post a "failed" reply with the id.
- [ ] `src/app/sample-music/sample-preview.ts:235`, `src/app/clip-editor/fine-peaks.ts:3`, `src/frame/round-position.ts:1` — Literal `/ 1000` and two local copies of the ms-per-second constant. Fix: import `MILLISECONDS_PER_SECOND`.
- [ ] `src/app/server-focus-pass.ts:248-250` — The allow check is repeated from `followServerFocusStart`. Fix: one place.

### Exports, share and PWA

- [ ] `src/share-page/qr-svg.ts:1`, `shared-show.ts:1` — The standalone share page imports from `src/app/` (qr-code, slide-boundaries), risking app code in `share.html`. Fix: move both into a shared non-app module.
- [ ] `src/app/export-errors/describe-export-failure.ts:36` vs `export-video.ts:180-185` — Two "storage full" detectors; the sheet's does not walk `cause`, so a wrapped quota error shows as "unknown". Fix: one exported cause-walking `isQuotaExceeded`.
- [ ] `src/app/html-export/html-export-session.ts:198` — Once the sheet is closed, every error is dropped unlogged. Fix: log any error that is not the signal's reason.
- [ ] `src/app/video-export/deliver-file.ts:3` and siblings — `"AbortError"`/`"QuotaExceededError"` names defined in four places; `HtmlExportSession.deliver` re-implements `deliverFile`. Fix: one DOMException-names module; reuse `deliverFile`.
- [ ] `src/app/html-export/browser-html-export-device.ts:47` — "Open" runs the exported page as a `blob:` URL on the app's origin; one future escaping slip is app-origin XSS. Fix: sandboxed iframe, or download/share only.
- [ ] `src/app/video-export/video-export-session.ts` — Open/probe, target choice, run, outcome mapping and delivery in one module. (#177 trims it to 263 lines.) Fix: move `#finish`'s outcome→state mapping into a pure function beside `export-sheet-state.ts`.

### App shell, routing and editors

- [ ] `src/app/App.svelte:227` — The slideshow route's `{#await}` has no pending or catch branch: blank while loading, blank with no back on failure. Fix: a `RouteSkeleton` while pending; leave to the parent on failure.
- [ ] `src/app/navigation/navigator.ts:132` — A refused leave guard restores with one `push` after a multi-entry back, so later backs skip levels. Fix: `history.go(+n)` for the popped steps.
- [ ] `src/app/navigation/navigator.ts:79-88` — A second `open()` while a pop is pending counts steps from the pending target. Fix: queue or ignore an open while `#pushAfterPop` is set.
- [ ] `src/app/routes/PlayerLayer.svelte` (onMount) — If music, focus or beats fail to load, the player stays invisible. Fix: a failure state with the PlayerCard error and a way out.
- [ ] `src/app/i18n/translator.ts:154` — An unknown runtime key fails with a misleading plural error. Fix: throw naming the missing key.
- [ ] `src/main.ts:105` — `reportError(event.error)` gets `null` for cross-origin errors. Fix: `event.error ?? new Error(event.message)`.
- [ ] `src/main.ts` — The composition root sits at the line limit (#177 brings it to 256). Fix: `wire-*.ts` modules for the server and music wiring.
- [ ] `src/app/start/first-launch.ts` — `KeyValueStorage` lives in the first-launch module and settings import it sideways. Fix: a small shared `storage-port.ts`.
- [ ] `src/app/settings/stored-choice.ts:16-19` — An unrecognised stored value is read as the default without a log. Fix (optional): warn once.

### Screens

- [ ] `src/app/settings/SettingsSheet.svelte`, `src/app/screens/slideshow/export-sheet/ExportDialog.svelte` — Still carry their own dialog frame beside `components/Sheet.svelte`; their metrics differ (Settings docks top right, Export pads 20 px and grows to 92 %). Fix: settle the metrics, then frame both with `Sheet`.
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
