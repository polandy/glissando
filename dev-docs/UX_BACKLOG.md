# UX backlog

Findings of the UX review of 2026-10-31 (main at 0a165a9, release 0.0.12), kept as open work
until each item is done or rejected. One file per theme in `ux_backlog/`; an item is removed
once it ships. `TODO.md` carries one line per theme and points here.

| Theme                                                        | Items      | Weight  |
| ------------------------------------------------------------ | ---------- | ------- |
| [Slideshow screen](ux_backlog/slideshow-screen.md)           | UX-04      | highest |
| [Selection and editing](ux_backlog/selection-editing.md)     | UX-08      | high    |
| [Copy and terminology](ux_backlog/copy.md)                   | UX-14 … 16 | high    |

## How the review was made

- The built app (`npm run build`, `vite preview` on 127.0.0.1:4173) was driven with Playwright
  through every reachable screen at phone (390×844, touch, 2×) and desktop (1280×800), light
  theme, with synthetic gradient JPEGs (`src/import/testing/synthetic-jpeg.ts`) carrying EXIF
  dates, and a generated WAV. The tour script is kept in `scripts/ux-tour/` so the screenshots
  can be made again; it is a capture aid, not part of `npm run verify`.
- The UI was inventoried from the code: routes, sheets, dialogs, toasts, the 1225 English
  strings in `src/app/i18n/catalogue-en*.ts`, touch target sizes in `src/styles/base.css`.
- Not reviewed, no backend was running: Immich, the server library, TV remote, share link,
  picture frame, PWA install prompt, a finished video export.
- A second pass checked every item against the screenshots and the code once more: UX-01 was
  downsized (Play is above the fold, only the strip is not), UX-25 restated (restore comes from
  the tab's history state), a suspected date-format bug was dropped (dates come from
  `Intl.DateTimeFormat` with the UI locale), and UX-27 / UX-28 were added. Confirmed good and
  left alone: the open-file error banner, the no-music state, the delete confirmation, the
  import selection bar's labels.

## Yardsticks

The product principles in `SCOPE.md`: few controls at a time, one obvious next step per
screen, "a feature that needs a manual is redesigned, not documented", errors at their cause in
user language. Touch targets: 44 pt (Apple HIG) / 48 dp (Material). Reading level: a
non-technical user who has never heard of codecs, BPM or Ken Burns.

## Working through it

- One item (or one theme, if the items are small) per session and per PR, as
  `dev-docs/WORKFLOW.md` says. Highest weight first; inside a theme in item order.
- A UI change starts as a mockup: one working page with a variant switcher, pushed to the
  glissando-assets Pages site, approved by the owner before implementation. Copy-only items
  (theme Copy) need no mockup; a before/after table in the PR is enough.
- Each item names **Done when**; the PR proves it (test, screenshot at phone width, or both).
- A behaviour change updates `docs/user-guide.md` in the same PR.
- The item's entry is deleted from its theme file and from `TODO.md` in the PR that ships it.

## Work packages

One package = one branch, one worktree beside the checkout, one PR, one session. Packages own
disjoint files, so they run in parallel without merge conflicts; the owner table below is
binding, a package that needs a change in a file it does not own waits for that file's package.

| Pkg | Items                                 | Owns (nothing else is edited)                                                                                                                                                                  | Mockup | Model  |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| P0  | UX-14 glossary                        | this backlog, `COPY.md`, the `BRAND.md` pointer                                                                                                                                                | no     | any    |
| P1  | UX-14 sweep, 15, 16                   | every `catalogue-{en,de}-*.ts` not owned below, `catalogue-{en,de}.ts` except settings keys, `docs/user-guide.md`, the banned-variant test                                                     | no     | sonnet |
| P2  | UX-09, 13, 24, 28                     | `card-settings-editor.ts`, `chapter-settings-editor.ts`, clip Reset, `WaveformBars.svelte`, `ClipWaveform.svelte`, `StartRoute.svelte`, `SlideshowRoute.svelte`, `FocusSearchIndicator.svelte` | no     | sonnet |
| P3  | UX-23, 25, then 22                    | `navigation/*`, `ImportRoute.svelte`, `AddPicturesRoute.svelte`, `Header.svelte`                                                                                                               | no     | sonnet |
| P4  | UX-17, 18, 19, 20, 21                 | `ExportDialog`, `VideoExportSheet`, `HtmlExportSheet`, file page, `SettingsSheet`, catalogue `-video -html -share -file-page` + settings keys                                                  | light  | opus   |
| P5  | UX-01, 02, 03, 27                     | `SlideshowScreen.svelte` + its panel/strip-head, `FineSettings.svelte`, `chapter-sheet/*`, toast placement, catalogue `-mood` tile strings, `chapters.*` keys                                  | yes    | opus   |
| P6  | UX-05, 06, 08                         | selection bar, `StripTile.svelte`, strip, `base.css` coarse-pointer block                                                                                                                      | yes    | opus   |
| P7  | UX-10, 11, 12, 08 music               | `music-editor/*` except the stepper component, catalogue `-music -playlist -timing`                                                                                                            | yes    | opus   |
| P9  | UX-04                                 | title derivation, the creation step's last screen, `SlideshowCard.svelte`                                                                                                                      | yes    | opus   |

Order and waves:

1. **P0 first**, merged before anything else branches: every later package uses the glossary's
   words, so no package invents its own.
2. **Wave 1, in parallel, no approval needed:** P1, P2, P3 (UX-22 only after the owner has
   checked the back gesture on an Android phone), and P4 if the owner waives its mockup. P1
   merges before any UI package goes to review; UI packages rebase onto it once.
3. **Mockup wave, in parallel with wave 1:** four mockup sessions, each ends with a URL on the
   glissando-assets Pages site: P5+P6 share one page (same screen, two variant switchers), P7,
   P8, P9 one page each. The owner approves in one sitting.
4. **Wave 2 after approval:** P5…P9 implemented in parallel, one worktree each.

Token rules per package session: read only the item text and the owned files (grep first);
mockup sessions read `BRAND.md`, `src/styles/tokens.css` and the item, not the app source; one
full `npm run verify` per package in a sonnet subagent at the end, browser tests of the owned
area only while working; P1–P3 run at low effort. Three to four sessions at once is the
practical ceiling, set by the owner's review time, not by conflicts.

## Item format

```
### UX-nn Title  (size S/M/L)
Problem — what the user runs into.
Where — screen and how it is reached; what the review saw.
Why — the principle or heuristic it violates.
Proposal — the direction; alternatives if there is a real choice.
Done when — the acceptance check.
```
