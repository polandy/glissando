# Editing the slideshow

- **Editing the slideshow** (`editing/slideshow-editor.ts`; pure operations in
  `src/library/slideshow-edits.ts`, the music's in `slideshow-edits-music.ts`): every edit applies at once and is stored; the screen is
  `aria-busy` from an edit until every edit so far is stored.

| Section                                                                                             | What it covers                                                                   |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Remove, select and reorder](slideshow-editing/REMOVE_SELECT_REORDER.md)                            | Removing a picture, the selection bar, dragging                                  |
| [Selecting several, moving, removing several](slideshow-editing/SELECTING_SEVERAL.md)               | Select mode and moving or removing a group                                       |
| [Adding pictures](slideshow-editing/ADDING_PICTURES.md)                                             | Adding pictures to an existing slideshow                                         |
| [Rename, transitions, portrait pictures and delete](slideshow-editing/RENAME_TRANSITIONS_DELETE.md) | The title, the transitions and portrait pictures sheets, deleting                |
| [Title slide and closing slide](slideshow-editing/TITLE_SLIDES.md)                                  | The two card tiles, the card sheet, defaults, what is stored                     |
| [Look](slideshow-editing/LOOK.md)                                                                   | The look row and sheet: preview, tiles, back to None                             |
| [Mood](slideshow-editing/MOOD.md)                                                                   | Calm, Lively or Custom: row, sheet with live preview, leaving by a single change |
