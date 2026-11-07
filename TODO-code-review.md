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

- [ ] `package-lock.json` — `npm audit` (dev only): the `minimatch` (via eslint, typescript-eslint) and `deepmerge` (via vite-plugin-svelte) chains wait on upstream. Fix: update when a non-major release lands; never `audit fix --force`.

## LOW

### Server, sync and TV

- [ ] `src/server-library/http-server-library-client.ts:101-103` — The 412 branch calls `response.json()` without `isJson`, so a proxy's HTML 412 is a bare `SyntaxError`. Fix: `isJson` first, same descriptive error as `#json`.
- [ ] `src/app/server-library/server-copy-flows.ts:75` — `keepCopy` passes a signal nobody can abort, so the required signal in `keep-copy.ts` is dead weight; `#progress` is one slot for concurrent copies. Fix: expose cancel per flow or drop the signal; key progress by slideshow.
- [ ] `server/collect-body.ts:13-18` — An oversized body is drained to its end with no byte or time cap. Fix: a fixed drain budget, then destroy the socket after the 413.
- [ ] `server/music-routes.ts:16-17,45-50` + `src/server-library/save-on-server.ts:39-45` — The 1 h music grace runs per upload and every upload sweeps, so a slow multi-song save can lose its own earlier songs (409 `musicMissing`). Fix: restart the caller's grace on each upload, or measure from the last upload.

### Player

- [ ] `src/player/webgl/shader-programs.ts:289-310`, `webgl/card-item-program.ts:144-167` — Compile/link failures throw without deleting shaders/program. Fix: delete before throwing.
- [ ] `src/player/webgl/webgl-renderer.ts:257-271` — `dispose()` never deletes `#mainBuffer`. Fix: `deleteBuffer`.
- [ ] `src/player/create-frame-player.ts:277-280` — `loseContext()` called a second time after `renderer.dispose()`, a GL warning per dispose. Fix: let the renderer own context release.
- [ ] `src/player/webgl/card-item-program.ts:78,80`, `webgl/card-pass.ts:178` vs `webgl-renderer.ts:30` — Literal `2`/`4` in `vertexAttribPointer`; two texture-unit constants silently equal across modules. Fix: name the vertex constants; one texture-unit map module.
- [ ] `src/player/browser/music-output.ts:267-272` — `createOrNull` swallows the error without logging. Fix: warn before returning null.
- [ ] `src/player/browser-player.ts:131` — `matchMedia` called on every drawn frame. Fix: one `MediaQueryList`, read `.matches`.
- [ ] `src/player/parse-primitives.ts:359-364` — `readPositiveInteger` has no upper bound; `durationMs: 1e308` makes the timeline `Infinity`. Fix: a named maximum.
- [ ] `src/player/slideshow-player.ts:282-284` — A `loadAroundScreen` rejection is swallowed with a comment only. Fix: log it.

### Library and file format

- [ ] `src/library/indexeddb-store.ts:105,119`, `indexeddb-media.ts:194-203,248` — The media-keyed store list is written out four times. Fix: one exported `MEDIA_KEYED_STORES`.
- [ ] `src/glissando-file/slideshow-fields-media.ts:43-47,82-86`, `slideshow-fields.ts:67-70`, `read-manifest.ts:121` — Version gates against versions 2–12 are dead code since `OLDEST_READABLE_FORMAT_VERSION` is 13. Fix: drop the gates and constants, list keys unconditionally.
- [ ] `src/library/indexeddb-store.ts:288-291`, `src/main.ts:121` — A `VersionError` (newer DB) and a `versionchange` close give a blank app or "unexpected error" toasts with no reload prompt; no `onblocked`. Fix: a "reload / newer version open" screen; reload on `versionchange`.
- [ ] `src/library/indexeddb-schema.ts:58-87` — Incremental v1→v8 upgrade chain despite the no-migration policy. Fix: on any `oldVersion > 0`, drop every store and create the current set.
- [ ] `src/app/glissando-file/open-flow.ts:161-164` — When the signal is aborted, every error counts as the cancel; a real failure racing Cancel is lost. Fix: log unless it is the signal's reason.
- [ ] `src/glissando-file/write-glissando-file.ts:126-136` — A `releaseClaim` rejection after a successful save shows an error for an open that worked. Fix: release after the try, or log without failing.
- [ ] `src/glissando-file/browser/media-decoders.ts:22` + `check-media-file.ts:258` — EXIF orientation 5–8 swaps width/height in the size check, so a hand-swapped picture (ADR-0038) is refused as damaged. Fix: `imageOrientation: "none"` for the check.

### Import and Immich

- [ ] `src/app/import/browser-intake-ports.ts:44` — Place-data fetch has no `response.ok` check; a 404 becomes a parse error and every picture refetches 848 KB. Fix: check `ok`, stop retrying for the import.
- [ ] `src/places/nearest-place.ts:185` — The 3×3 one-degree cell search misses places within 50 km east/west above ~64° latitude. Fix: widen the longitude span by `ceil(1/cos(lat))`.
- [ ] `src/immich/photo-selection.ts` (`allAlbumPhotos`) — A non-advancing `nextPage` loops forever. Fix: fail loud unless it advances.
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
