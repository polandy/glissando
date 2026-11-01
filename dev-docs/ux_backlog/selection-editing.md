# UX backlog — Selection and editing

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Strip, selection bar
(`src/app/screens/slideshow/`), picture editor (`src/app/picture-editor/`), `src/styles/base.css`.

### UX-07 Duration stepper moves 0.5 s per tap (size S)

Problem — The picture editor's Duration is a − / + stepper in half-second steps; reaching 15 s
from the 7 s default is 16 taps. The same stepper pattern is used for music Start / End.

Where — Picture editor, Duration section; music editor, Excerpt Start/End.

Why — Steppers suit small ranges; this one spans 2–15 s.

Proposal — A slider with the current value and snap points, or presets (3 · 5 · 7 · 10 · 15 s)
plus fine − / +. Press-and-hold acceleration is the minimum.

Done when — Any value in the range is reached in at most three interactions.

### UX-08 Touch targets below the platform minimum in component styles (size M)

Problem — Under a coarse pointer the shared controls (`.btn`, `.icon-btn`, the switch) pad their
hit area to `--gl-hit-min` (44 px), but targets styled in their own components stay smaller:
Fine settings' "More settings" toggle (18 px high); in the picture editor the frame chips, "View
now", the Frame | Play and Start | End segments, the half-second steppers, a bare checkbox, the
caption field, "Swap start and end" (its pad overlaps the next button) and "Back to automatic"
(clipped by its container); in the music editor the grip and remove buttons, the pick and add
rows, the trim handles, "About 5 s each", "Fill with music", the steppers and the range input.
The cards, export, chapter and focus sheets, the clip editor and the header are not measured yet.

Where — `FineSettings.svelte`, `src/app/picture-editor/`, the music editor; the `KNOWN` lists in
`slideshow-screen-touch-targets.browser.test.ts` and `editors-touch-targets.browser.test.ts`.

Why — 44 pt / 48 dp guidelines; mis-taps in a dense editor change the wrong value.

Proposal — Pad each hit area to `--gl-hit-min` under `(pointer: coarse)`, as `base.css` does;
measure the unmeasured sheets with `src/app/testing/touch-target.ts`.

Done when — The `KNOWN` lists are empty and the remaining sheets and editors are measured.

### UX-09 Clear caption and TV Disconnect have neither confirm nor undo (size S)

Problem — Clear caption and TV Disconnect act at once with no undo toast, while removing a
picture, a song, a chapter, a title slide or a clip's settings offers Undo.

Where — `picture-editor/CaptionField.svelte` (the clear button), the TV sheet's Disconnect.

Why — The app's own rule: undo from a toast, confirm only for deleting a slideshow.

Proposal — Raise the existing undo toast pattern: "Caption cleared · Undo" (goes with P8, which
owns `picture-editor/*`); decide whether Disconnect needs one at all — nothing is lost, the TV
can be connected again.

Done when — Clearing a caption has a unit test proving the undo restores the previous text, and
the toast appears in a browser test.
