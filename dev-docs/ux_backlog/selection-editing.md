# UX backlog — Selection and editing

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Strip, selection bar
(`src/app/screens/slideshow/`), picture editor (`src/app/picture-editor/`), `src/styles/base.css`.

### UX-08 Touch targets below the platform minimum in component styles (size M)

Problem — Under a coarse pointer the shared controls (`.btn`, `.icon-btn`, the switch) pad their
hit area to `--gl-hit-min` (44 px), but targets styled in their own components stay smaller:
Fine settings' "More settings" toggle (18 px high). The picture and music editors are measured and clean.
The cards, export, chapter and focus sheets, the clip editor and the header are not measured yet.

Where — `FineSettings.svelte`; the `KNOWN` list in `slideshow-screen-touch-targets.browser.test.ts`.

Why — 44 pt / 48 dp guidelines; mis-taps in a dense editor change the wrong value.

Proposal — Pad each hit area to `--gl-hit-min` under `(pointer: coarse)`, as `base.css` does;
measure the unmeasured sheets with `src/app/testing/touch-target.ts`.

Done when — The `KNOWN` list is empty and the remaining sheets and editors are measured.
