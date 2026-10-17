# Selecting several, moving, removing several

- **Selecting several**: "Select" (a toggle, `aria-pressed`) left of "Add media" in the
  strip header, holding a tile on touch (450 ms, a short vibration where the device has
  one), Ctrl/⌘+click, Shift+click or Ctrl+Space start it; a single selection stays in it
  (holding another tile instead replaces it). Every tile then shows a circle top right (filled
  in the accent with a check when selected; the ✕ and the grip give way to it), and a tap,
  click, Space or Enter adds or removes a tile; Shift+click and Shift+Space add the range from
  the last tile picked. The narrow hint adds "hold to select several". The bar's count reads
  "3 selected" (with a contiguous group "3 selected · 4–6 of 12"; up to 720 px only the
  number in an accent pill), shown on narrow screens too; Edit shows only while exactly one is
  selected; with none selected (after "Select") Earlier, Later and Remove look disabled.
  Done, Esc or "Select" again end it and deselect all; deselecting the last one ends it,
  unless it was started with "Select".
- **Moving**: Earlier and Later move the whole selection one step and keep it selected; a
  scattered selection first gathers where its first picture is (Earlier) or its last (Later),
  as one block in play order, after that the block moves (ADR-0019). Earlier looks disabled
  only when the selection is one block at the start, Later at the end. Drag (mouse: press and
  move 8 px; touch: hold a tile until it lifts, then move — the held tile is selected first):
  a dragged selected tile carries the whole selection, an unselected one only itself; a stack
  of up to three thumbnails with the count follows the pointer, the dragged tiles fade, and a
  dashed lemon line before or after the tile under the pointer shows where the group lands,
  together, in play order; near the viewport's top or bottom edge the page scrolls along.
  Letting go of a held tile in place only selects it. Keyboard: arrows move the focus (with a
  single selection, the selection follows; while selecting several, only the focus),
  Shift+arrows move the selection (up and down by a row; an unselected focused tile is
  selected alone first), Esc deselects. Any move makes the order the user's own.
- **Removing several**: Remove or Delete (on a selected tile) removes the whole selection;
  the toast counts them all ("3 pictures removed") and Undo puts each back where it was. At
  least one picture stays: removing every picture is answered with the toast "At least one
  picture stays. To get rid of all of them, delete the whole slideshow.", keeping the
  selection.
