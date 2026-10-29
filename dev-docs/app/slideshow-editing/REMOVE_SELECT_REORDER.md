# Remove, select and reorder

- **Remove**: a ✕ on a tile, "Remove" in the selection bar, or Delete/Backspace on a focused
  tile — never confirmed. The ✕ and the drag grip are for a mouse only (`(hover: hover) and
(pointer: fine)`): shown on hover, and the grip on the selected tile too; the selected tile has
  no ✕ of its own, the bar's Remove removes it; touch has neither and uses the selection bar. A toast "Picture removed" with "Undo" follows; removals made while it is
  shown add up ("3 pictures removed") and one Undo puts them all back where they were. Any move
  ends that batch and dismisses the toast, so Undo never puts pictures back at positions that
  shifted meanwhile; leaving the screen dismisses it too. While the toast shows, the removed
  pictures' media is claimed against the clean-up (`dev-docs/LIBRARY.md`). The last picture stays: its ✕ is disabled (titled with the reason);
  "Remove" looks disabled but stays focusable and clickable (`aria-disabled`), and it and
  Delete answer with the toast "The last picture stays. To get rid of it, delete the whole
  slideshow.", keeping the selection.
- **Select and reorder** (mockup:
  https://polandy.github.io/glissando-assets/mockups/move-together/): a tap on a tile selects
  it (outlined in the accent, its number badge in the accent; another tap deselects) and opens
  the selection bar at the bottom — "Picture 3 of 12" (a polite live region, so every move is
  announced; visually hidden up to 720 px, where the bar spans the width), then one icon per
  action — ◀ "Earlier", ▶ "Later", 👁 "View full screen" (opens the picture full screen,
  [PICTURE_VIEWER.md](../PICTURE_VIEWER.md)), ✎ "Edit picture" (opens the picture editor,
  [PICTURE_EDITOR.md](../PICTURE_EDITOR.md)), "Insert chapter before"
  ([TRIP_CHAPTERS.md](TRIP_CHAPTERS.md)), 🗑 "Remove picture" — and "Done" in words. Each icon's
  words are its accessible name and show in a bubble above it (`BarAction.svelte`; mockup:
  https://polandy.github.io/glissando-assets/mockups/selection-bar/, variant A): with a mouse
  after resting on it a moment, or on keyboard focus; with a finger on a press and hold (450 ms)
  — letting go then does nothing, and the bubble stays a moment to be read; a quick tap acts at
  once. The bar is drawn inverse to the
  screen (dark on the light theme, light on the dark one), with "Done" in the accent and
  Remove's icon in the danger colour, so it stands out in either theme (mockup:
  https://claude.ai/artifact/6a6E2dqYM52hUkjCek4CLE, variant B). At the ends Earlier
  or Later looks disabled but stays focusable (`aria-disabled`) and does nothing. While the
  bar shows, the content keeps room below it for the bar, and the selected tile scrolls clear
  of it. The bar's buttons highlight on hover only where the pointer hovers. With a mouse, a
  double-click on a tile opens the picture editor too.
- **Shuffle** (mockup: https://polandy.github.io/glissando-assets/mockups/shuffle/, variant A):
  "Shuffle" in the strip header, left of "Select", puts every picture in a new random order. It
  never returns the order it started from, and with one picture it is disabled. The order is
  stored like any manual one, so the order line reads "Own order" and the player and the
  exports use it. The tiles glide to their new places (not with reduced motion), and a toast
  "12 pictures shuffled" with "Undo" follows. Undo brings the order from before the shuffle back, leaving edits made since (a
  caption) alone; a newer toast replaces it, and leaving the screen dismisses it. The random
  source is injected into the editor (`SlideshowEditorPorts.random`).
