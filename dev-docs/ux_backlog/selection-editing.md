# UX backlog — Selection and editing

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Strip, selection bar
(`src/app/screens/slideshow/`), picture editor (`src/app/picture-editor/`), `src/styles/base.css`.

### UX-05 Selection bar on the phone is seven unlabelled icons (size M)

Problem — Selecting a picture opens a bottom bar with ‹ › (Earlier / Later), eye (View),
pencil (Edit), bookmark (Insert chapter before), bin (Remove) and a "Done" button. Only Done
has a label. "Insert chapter before" as a bookmark glyph is not guessable; the user guide tells
people to long-press an icon to learn what it does, which is the manual the principles forbid.

Where — Slideshow screen, tap a strip tile, phone. Desktop shows the same bar with room to
spare.

Why — Icon-only bars work for universally known glyphs (play, delete); chapter insertion is
not one. Seven targets in 390 px also squeezes each below 44 pt.

Proposal — Three labelled primary actions in the bar (View, Edit, Remove) plus Done; put
Earlier / Later and Insert chapter into a "⋯" overflow, or make the bar scroll horizontally with
icon + label stacked. On desktop keep all with labels. Pair with UX-06 so reordering no longer
needs the bar.

Done when — Every action in the bar shows a visible label at 390 px; each target is at least
44×44 CSS px; browser test on labels and bounding boxes.

### UX-06 Reordering on the phone costs three taps per position (size L)

Problem — On narrow layouts the strip says "tap to reorder": select, then Earlier / Later once
per step. Moving one picture ten places is twelve taps. Drag exists only on wide/mouse layouts.

Where — Strip head hint text; `StripTile.svelte` (double-click opens the editor with a mouse
only).

Why — Direct manipulation for ordering is the expectation on touch; the step buttons are a
fallback, not the main path.

Proposal — Long-press to lift a tile, drag with auto-scroll, drop between tiles, with a
haptic/visual lift. Keep Earlier / Later for accessibility (keyboard, switch access). Consider
"Move to…" (start / end / before picture N) in the overflow for long moves.

Done when — A picture is moved from position 1 to 10 with one gesture in the phone e2e flow;
keyboard reordering still works.

### UX-07 Duration stepper moves 0.5 s per tap (size S)

Problem — The picture editor's Duration is a − / + stepper in half-second steps; reaching 15 s
from the 7 s default is 16 taps. The same stepper pattern is used for music Start / End.

Where — Picture editor, Duration section; music editor, Excerpt Start/End.

Why — Steppers suit small ranges; this one spans 2–15 s.

Proposal — A slider with the current value and snap points, or presets (3 · 5 · 7 · 10 · 15 s)
plus fine − / +. Press-and-hold acceleration is the minimum.

Done when — Any value in the range is reached in at most three interactions.

### UX-08 Touch targets below the platform minimum (size M)

Problem — `.btn` is 38 px high, `.icon-btn` 36×36, `.icon-btn.small` 28×28, the switch
38×22 with an 18 px knob; the per-tile remove "×" on strip tiles is small and sits on the
image. Only `PictureFrame.svelte` and `FrameWell.svelte` have coarse-pointer rules.

Where — `src/styles/base.css` (~93, ~134, ~153); strip tiles; sheets' header close buttons.

Why — 44 pt / 48 dp guidelines; mis-taps on a dense strip remove or select the wrong picture.

Proposal — A `@media (pointer: coarse)` block in `base.css` raising `.btn`, `.icon-btn` and
the switch hit area to 44 px (visual size can stay, pad the hit area). Move the strip tile
remove into the selection bar on touch, or enlarge its hit area to 44 px with an inset.

Done when — A browser test at phone viewport with coarse pointer asserts every interactive
element on the slideshow screen, sheets and editors measures at least 44×44 px.

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
