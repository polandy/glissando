# Trip chapters, in the editor

Mockup: https://polandy.github.io/glissando-assets/mockups/day-chapters/. Domain, stored fields
and composition: [player/TRIP_CHAPTERS.md](../../player/TRIP_CHAPTERS.md).

## The strip

`PictureStrip.svelte` renders a **chapter tile** (`ChapterTile.svelte`) right before its anchor
picture's tile, from `chaptersOfSlideshow`: a slim dashed chip, a full-row bar on the phone
(`@container (max-width: 720px)`), showing the chapter's effective title and subtitle, e.g.
"Lisbon · Day 11–12 · 22–23 June". A hidden automatic chapter is omitted from the strip entirely —
its picture still plays, just with no card over it. A chapter whose title or subtitle was edited
shows a small accent dot before its text. The tile takes no part in drag, select or keyboard
reorder (no `.pick` class, no `data-picture-id`); tapping it opens the chapter sheet.

## Insert chapter

With exactly one picture selected, the selection bar offers **Insert chapter before**, a labelled
action, inline on a wide screen and in the second row of the bar on a narrow one (`SelectionBar.svelte`, [REMOVE_SELECT_REORDER.md](REMOVE_SELECT_REORDER.md)). It inserts an added chapter right before that picture
(`ChapterSettingsEditor.insertChapter`, a no-op if one is already there) and opens its sheet at
once, prefilled with the automatic text for that spot.

## The chapter sheet

`chapter-sheet/ChapterSheet.svelte`: a bottom sheet on the phone, a dialog from 720 px. Opened
with an anchor picture's id, it shows:

- A **preview** of the chapter's card (`chapter-preview-model.ts`): the anchor picture, veiled,
  with the chapter's effective title and subtitle in place.
- **Title** and **Subtitle** fields, prefilled with the effective (edited or automatic) text.
  Each has its own **Reset to automatic** button, disabled while that field is not edited.
- For an **automatic** chapter: a **Hide this chapter** switch — hiding keeps it in the listing
  (and in `chapterEdits`) but drops its card, the same as an automatic chapter that fails Rule C.
- For an **added** chapter: a **Delete chapter** button instead of the switch — deleting removes
  it outright and closes the sheet.

Every change saves as it is made, like the other sheets (`chapter-sheet-edits.ts` dispatches to
`ChapterSettingsEditor`). Close / Escape / the backdrop closes the sheet; focus goes back to
wherever it was opened from.

## The automatic-chapters switch

Slideshow-wide, so not part of a chapter's sheet: an inline **Trip chapters** switch row in the
slideshow's **Fine settings** fold (`FineSettings.svelte`), one tap from the open fold. A helper
line under the label says what the switch does (on: a short slide wherever the trip moves on to a
new place; off: only chapters you added show); while the slideshow's order is the owner's own
(`ownOrder`) the switch is disabled and the helper says so. It stays reachable when the strip
shows no chapter at all (too few days, or every one hidden). Turning it off drops the automatic
chapters from the strip and the player and keeps the added ones.
