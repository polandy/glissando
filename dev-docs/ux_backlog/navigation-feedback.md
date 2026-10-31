# UX backlog — Navigation and feedback

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Navigator `src/app/navigation/navigator.ts`,
routes `src/app/navigation/route.ts`, `src/app/routes/`.

### UX-22 Hardware back with an open sheet or viewer (size M, verify first)

Problem — Sheets (Mood, Look, Transitions, Share, …), the More menu and the picture viewer are
native `<dialog>` or local overlays with no history entry; only Settings pushes one. On Android
(PWA or browser) the back gesture fires popstate, so it likely navigates the route underneath
while the dialog is open, or leaves the slideshow instead of closing the sheet. The viewer
has the same risk.

Where — `navigator.ts:92` (popstate), sheets opened with `showModal`.

Why — The platform convention on Android is: back closes the topmost layer. Losing the
slideshow screen because a sheet was open is disorienting.

Proposal — Verify on a real Android phone (Chrome, installed PWA) and on iOS Safari's swipe
back. If confirmed: push a history entry when a sheet / menu / viewer opens, pop it on close,
and close the layer on popstate (one mechanism in the navigator, used by every layer). The
player already behaves this way per SCOPE.md ("back arrow and browser back do the same").

Done when — A browser test simulates popstate with an open sheet and asserts the sheet closes
and the route stays; manual check on Android noted in the PR.

### UX-26 Picture editor density on the phone (size M)

Problem — Three stacked segmented controls (Frame | Play, Start | End, the Automatic badge
chips), the "Look again" link inside the dark frame area, and a transition grid of seven
tiles each carrying a small numeric badge (the next picture's number) that no one decodes.
Duration and Transition each repeat a "Back to automatic" row. The same numeric badge sits on
the Look sheet's tiles and on the Transitions sheet's tiles on the slideshow screen.

Where — Picture editor, phone (`PictureEditorScreen.svelte`), transition tiles in
`src/app/picture-editor/`; the shared tile component used by the Look and Transitions sheets.

Why — Too many equal-weight controls at once; the badge is a mechanism leak wherever it
appears.

Proposal — Drop the tile badges everywhere (the heading already says "Transition to picture
5"; a preview tile needs no counter). Fold Duration and Transition into one "Timing" section
with a single "Back to automatic". Move "Look again" into the motion section as a text button.
Consider making Frame | Play a tab bar at the bottom on the phone so the preview area stays
fixed.

Done when — At 390×844 the editor's sections are reachable within two screens; no tile in the
editor, Look or Transitions sheet carries a numeric badge; browser tests for the phone editor
still pass.
