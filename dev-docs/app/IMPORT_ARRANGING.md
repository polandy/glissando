# Picking and arranging while importing

The pictures step of the import wizard ([IMPORT_WIZARD.md](IMPORT_WIZARD.md)) and "Add media"
([ADDING_PICTURES.md](slideshow-editing/ADDING_PICTURES.md)) share one body
(`import/PictureIntakeBody.svelte`). Mockup (approved):
https://polandy.github.io/glissando-assets/mockups/import-arrange/

## Picking while an import runs

- Once something is chosen, "Add pictures" sits in the strip head, like the editor's "Add
  media" (`StripHead.svelte`), and the strip's dashed add tile opens the same menu
  (`AddPicturesMenu.svelte`). The menu offers "Pictures and videos", "A folder" and, where
  Immich is offered, "From Immich"; also while an import runs. Each pick (files, a folder, a
  drop, an Immich selection) joins the running import as one **pick** (`PictureImport`,
  PICTURE_IMPORT.md); picks are read one after another, one file at a time, in the order
  picked.
- **The queue** shows while anything is in flight: "Importing · k of N ready" with a mono
  "n left" and the mint meter, then one row per pick in pick order: a folder, files or Immich
  glyph; its name (the folder's name, "n pictures", "Immich · n photos"); "k / n" for the pick
  being read, "waiting" for a later one, "n ✓" for a finished one. The last four rows show,
  with "n earlier picks done" above them when there are more.
- **Stopping a pick**: an unfinished row's ✕ ("Stop importing <name>") drops that pick's
  waiting files; its pictures already in stay. The toast "Stopped <name> · n pictures already
  in stay" follows (without the second part when none is in). The file being read finishes
  and is dropped. Stopping the last unfinished pick ends the import as if it had finished.
- **Placeholders**: one shimmering tile per waiting file after the stored tiles; the one being
  read shows a running mint bar. Placeholders are not focusable, cannot be selected or moved
  and carry no number.
- After the queue is empty the culling check runs as before (IMPORT_WIZARD.md, Culling); a pick
  made while it runs starts the queue again, and the cull waits for it.

## Arranging (the new slideshow only)

The strip is the editor's (`screens/slideshow/PictureStrip.svelte`, `SelectionBar.svelte`; a tap selects, ADR-0039):
everything in [REMOVE_SELECT_REORDER.md](slideshow-editing/REMOVE_SELECT_REORDER.md) and
[SELECTING_SEVERAL.md](slideshow-editing/SELECTING_SEVERAL.md) holds, on stored pictures,
while the import runs, with these differences:

- No title-slide tiles; the placeholders follow the last picture, then the add tile where
  "Add pictures" or "From Immich" is on offer (none while linking a server slideshow with
  neither available).
- The selection bar has **View** where the editor has Edit; it opens the picture full screen
  ([PICTURE_VIEWER.md](PICTURE_VIEWER.md)), as do F on a focused tile and a double-click with
  a mouse. The picture editor needs a stored slideshow and stays in the editor.
- Removal is the step's own: the toast "Picture removed" · "Undo" that adds up, and the last
  picture can go too (the empty drop zone returns).
- The strip head reads "Capture order" or "Own order"; while the import runs it adds
  "· new pictures are sorted in by date" or "· new pictures go at the end".

**Order**: as long as nothing was moved, the strip is in capture order and every picture that
becomes ready is sorted in by its date. The first move (Earlier, Later, Shift+arrows, a drag)
or Shuffle makes the order the user's own: from then on pictures that become ready, and
set-aside pictures taken in, go at the end, in capture order among themselves; nothing placed
moves. A picture the user moved counts as chosen and is never set aside by a cull. "Create
slideshow" stores the order shown and, when it is the user's own, `ownOrder`.

A selection follows its pictures, not their places: a picture sorted in before it shifts the
tile and keeps it selected; new tiles glide in (not with reduced motion).

## In "Add media"

The queue, the placeholders, selecting, View, F and removing are the same; there is no
arranging: no Earlier, Later, drag, Shift+arrows or Shuffle, and the bar has View, Remove and
Done. The pictures go into the slideshow as ADDING_PICTURES.md places them.

## Keys (on a focused tile)

| Key                        | Does                                             |
| -------------------------- | ------------------------------------------------ |
| ← → ↑ ↓                    | move the focus (a single selection follows)      |
| Space, Enter               | select or deselect the tile                      |
| Ctrl/⌘+Space, Ctrl/⌘+click | select several: add or remove this tile          |
| Shift+Space, Shift+click   | select several: add the range from the last tile |
| Shift+arrows               | move the selection (not in "Add media")          |
| F                          | view the tile's picture full screen              |
| Delete, Backspace          | remove the selection, else the focused tile      |
| Esc                        | deselect                                         |
