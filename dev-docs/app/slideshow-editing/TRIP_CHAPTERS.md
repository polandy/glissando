# Trip chapters, in the editor

Mockup: https://polandy.github.io/glissando-assets/mockups/day-chapters/. Domain, stored fields
and composition: [player/TRIP_CHAPTERS.md](../../player/TRIP_CHAPTERS.md).

## The strip

`PictureStrip.svelte` renders a **chapter tile** (`ChapterTile.svelte`) right before its anchor
picture's tile, from `chaptersOfSlideshow`: a slim dashed chip, a full-row bar on the phone
(`@container (max-width: 720px)`), showing the chapter's effective title and subtitle, e.g.
"Lisbon · Day 11–12 · 22–23 June". A hidden automatic chapter is omitted from the strip entirely —
its picture still plays, just with no chapter slide. A chapter whose title or subtitle was edited
shows a small accent dot before its text. The tile takes no part in drag, select or keyboard
reorder (no `.pick` class, no `data-picture-id`); tapping it opens the chapter sheet.

## Insert chapter

With exactly one picture selected, the selection bar offers **Insert chapter**
(`SelectionBar.svelte`). It inserts an added chapter right before that picture
(`ChapterSettingsEditor.insertChapter`, a no-op if one is already there) and opens its sheet at
once, prefilled with the automatic text for that spot.

## The chapter sheet

`chapter-sheet/ChapterSheet.svelte`: a bottom sheet on the phone, a dialog from 720 px. Opened
with an anchor picture's id, it shows:

- A **preview** of the inserted chapter slide (`chapter-preview-model.ts`): the anchor picture,
  veiled, with the chapter's effective title and subtitle in place.
- **Title** and **Subtitle** fields, prefilled with the effective (edited or automatic) text.
  Each has its own **Reset to automatic** button, disabled while that field is not edited.
- For an **automatic** chapter: a **Hide this chapter** switch — hiding keeps it in the listing
  (and in `chapterEdits`) but drops its slide, the same as an automatic chapter that fails Rule C.
- For an **added** chapter: a **Delete chapter** button instead of the switch — deleting removes
  it outright and closes the sheet.

Below the chapter's own fields (or alone, in general mode — see below): an **Automatic chapters**
switch, with helper text explaining when it is off — including, always, while the slideshow's
order is the owner's own (`ownOrder`), where it is disabled and the helper text says so.

Every change saves as it is made, like the other sheets (`chapter-sheet-edits.ts` dispatches to
`ChapterSettingsEditor`). Close / Escape / the backdrop closes the sheet; focus goes back to
wherever it was opened from.

## Reaching the switch with zero chapters

The **Automatic chapters** switch must stay reachable even when the strip shows no chapter at
all (too few days, or every one hidden). A **Trip chapters** row in `InfoPanelRows.svelte`
(the same spot as the Transitions and Portrait pictures rows) shows the visible chapter count and
opens the chapter sheet in **general mode**: no anchor picture, so no preview or title/subtitle
fields, only the automatic-chapters switch.
