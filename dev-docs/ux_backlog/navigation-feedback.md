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

### UX-23 Browser back skips the "Discard selection?" guard (size S)

Problem — Leaving the import or add-pictures route with pictures selected asks "Discard
selection?" from the in-app Back and Cancel only; the browser back / popstate path has no
guard, so the selection is lost silently.

Where — `ImportRoute.svelte:78`, `AddPicturesRoute.svelte:75` (guard), `navigator.ts:92` (no
guard).

Why — Data loss without warning; the same action should behave the same from either back.

Proposal — Route the guard through the navigator: a route can register a "before leave"
check; popstate re-pushes the entry when the user chooses Keep choosing.

Done when — Browser test: popstate during import with a selection shows the dialog; Keep keeps
the route and the pictures.

### UX-24 Blank screen while route data loads (size S)

Problem — The start screen renders nothing until slideshows are loaded
(`StartRoute.svelte:126`); the slideshow route has no loading branch (`SlideshowRoute.svelte`
~180–215). On a slow device with many slideshows the first paint is an empty shell.

Why — "Never a spinner without a label", and never nothing.

Proposal — Skeleton cards (three grey cards) on the start screen and a skeleton strip on the
slideshow route, each with a visually hidden "Loading…" status, replaced in place.

Done when — A browser test with a delayed store shows the skeleton, then the content, with no
layout jump larger than the header.

### UX-25 Reload stays in the open slideshow; the Library crumb is not a link (size S, decide)

Problem — A reload restores the route from the tab's `history.state`
(`navigator.ts:33–37`), so the slideshow that was open comes back, not the library. That is a
fair "resume where you were", but the header crumb "Library" is plain text, so a user who
expects "home" has only the back arrow, which on a deep screen means several steps.

Where — `navigator.ts` launch restore; `Header.svelte` crumbs.

Why — Resume is fine; a visible, one-tap way home is missing.

Proposal — Keep resume. Make every crumb except the last a link (Library, the slideshow's
title inside an editor), styled as the brand's text link, 44 px tall hit area on touch.

Done when — Crumbs before the current one are links on every screen; e2e covers Library from an
editor.

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

### UX-28 Phone header shows a spinning ring with no words (size S)

Problem — While subjects are being detected after import, the header shows a lilac progress
ring; the label "Looking for subjects · 1 of 30" is hidden below a 720 px container width
(`FocusSearchIndicator.svelte`, `@container (max-width: 720px)`). On every phone this is a
spinner without a label for up to a minute.

Where — Start screen and slideshow screen header, phone, right after creating a slideshow.

Why — "Never a spinner without a label" (SCOPE.md), and the phone is the primary device.

Proposal — On narrow widths keep a short label ("Finding subjects 1/30") or move the status
into a one-line strip under the header; the ring alone is never the only signal. Tapping it
opens the Faces and subjects sheet, which already exists.

Done when — At 390 px a visible text label accompanies the ring (browser test with a running
search); the `aria-label` stays.
