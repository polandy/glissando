# Editing the slideshow

- **Editing the slideshow** (`editing/slideshow-editor.ts`; pure operations in
  `src/library/slideshow-edits.ts`, the music's in `slideshow-edits-music.ts`): every edit applies at once and is stored; the screen is
  `aria-busy` from an edit until every edit so far is stored.
  - **Remove**: a ✕ on a tile, "Remove" in the selection bar, or Delete/Backspace on a focused
    tile — never confirmed. The ✕ and the drag grip are for a mouse only (`(hover: hover) and
(pointer: fine)`): shown on hover and on the selected tile; touch has neither and uses the
    selection bar. A toast "Picture removed" with "Undo" follows; removals made while it is
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
    announced; visually hidden up to 720 px, where the bar spans the width), "◀ Earlier",
    "Later ▶", "✎ Edit" (opens the picture editor, [PICTURE_EDITOR.md](PICTURE_EDITOR.md)), "Remove", "Done". At the ends Earlier
    or Later looks disabled but stays focusable (`aria-disabled`) and does nothing. While the
    bar shows, the content keeps room below it for the bar, and the selected tile scrolls clear
    of it. The bar's buttons highlight on hover only where the pointer hovers. With a mouse, a
    double-click on a tile opens the picture editor too.
  - **Selecting several**: "Select" (a toggle, `aria-pressed`) left of "Add pictures" in the
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
  - **Adding pictures** (`add-pictures/`, route `{ screen: "add", slideshowId }`; mockup:
    https://polandy.github.io/glissando-assets/mockups/add-pictures/): the strip header's "Add
    pictures" opens the import's pictures step for this slideshow, under the crumbs "title / Add
    pictures", without the step bar, the music step and the "Slideshow from another device?"
    box. Its lead: "They go into place by capture date." (with own order: "Your own order stays;
    choose below where the new pictures go."), then "Glissando downscales them for this device;
    your originals stay untouched." The drop zone, the Immich box (its browser opens for this
    slideshow, Immich below), the progress, the tiles (with their ✕, Removing), the set-aside
    pictures (Culling, Import wizard; similar shots are found among the new pictures only) and the
    notices are the import's; pictures already in the slideshow are skipped (Duplicates, Import
    wizard), and "Add n" waits for the check as "Next" does. Once at least one new
    picture is stored and nothing is in flight, with own order a box "Where they go" (mockup:
    https://polandy.github.io/glissando-assets/mockups/sort-added-by-date/) offers a radio group
    "By capture date" ("Each goes right after the picture taken just before it.", chosen at
    first) and "At the end" ("After picture 24, in capture order."); the choice lives in the
    session, so it stays while the selection does, and every new selection starts by capture
    date. Below it, a box "After adding" shows pictures "24 → 32",
    duration "5:40 → 5:40" and, when automatic pictures share the music, per picture "14.2 s →
    10.6 s" — the composition rules (`src/compose/`, ADR-0008) on the slideshow with the new
    pictures, so own durations stay. With music the pictures fill, a line "The pictures keep sharing the music;
    each gets a little shorter. Pictures with their own duration keep it.", or, when the
    automatic pictures' share would fall below the 2 s floor, a lemon notice "The music is too short for all pictures: no
    picture shows for less than 2 s, so the slideshow runs 7:28 and the music 5:40."; without
    music, or with music whose pictures last their own seconds (ADR-0022), "Each new picture gets
    5 s; the slideshow gets longer." (the slideshow's seconds per picture). With own order the box ends with the play order after adding as small numbered
    thumbnails, the new ones outlined, and their spots, e.g. "2 after picture 1 · 1 after
    picture 6" ("before picture 1" at the very start); both follow the choice. The bottom actions: "Cancel" and "Add n". Cancel and ← with new pictures ask
    "Discard selection?" as in the import; discarding goes back to the slideshow unchanged and
    the clean-up deletes their media. While "Add n" stores, Cancel and ← are disabled and a
    discard is ignored. "Add n" stores the record once (`addPictures` in
    `slideshow-edits.ts`, through `updateSlideshowWith`): sorted by capture date the new pictures
    take their places and the slideshow stays sorted; with own order `ownOrder` stays and they go
    as chosen: by capture date each right after the picture taken last no later than it (the
    later one in play order on a tie), one older than all right before the oldest, several at one
    spot in capture order (`placeByCaptureDate`, `src/library/added-placement.ts`); or at the end
    in capture order. The screen then returns to the slideshow, where the new
    tiles carry an accent outline and a "new" badge while it is shown (label adds "new"), and
    the toast "8 pictures added" with "Undo" takes out those of them still in the slideshow
    (the next clean-up deletes their media). The focus pass starts for the new pictures, as
    after an import. A slideshow deleted meanwhile ends it like an edit would: back to start
    with "This slideshow no longer exists.", the new media discarded. The selection lives in
    memory for the tab like the import's (history restores the screen only from the screen
    itself or its Immich browser); opening "Add pictures" again on the same slideshow keeps it
    and takes the slideshow as stored now (its title, order and pictures, the known ones for
    Duplicates), on another slideshow discards it.
  - **Rename**: ✎ turns the title into a field (at most 80 characters): Enter or leaving it
    saves, Esc cancels, an empty title falls back to the automatic one from the capture dates.
  - **Transitions** (`slideshow/TransitionsSheet.svelte`, ADR-0010): the info panel's
    transitions row opens a modal sheet "Slideshow transitions" (bottom sheet up to 720 px wide,
    a centred dialog above, over a scrim) with the state "Default" or, accent-tinted, "Own
    choice". A radiogroup of eight tiles in four columns — Crossfade, Push, Wipe, Circle, Zoom,
    Dissolve, Cut, Alternating — each looping its effect from the first picture to the second
    (the only picture twice when there is one; "Alternating" shows the next effect each loop;
    still with reduced motion), the picture editor's `TransitionTile`. Crossfade carries the
    tag "Default"; while it applies, the checked outline is dashed. A tap stores the choice at
    once; the arrow keys move it (selection follows focus). The hint: "Every transition:
    Dissolve. It takes 30 % of the picture's time, at most 1 s.", for a cut "The pictures follow
    one another without a transition.", for alternating "The effects alternate from picture to
    picture, never the same one twice in a row." A note names the pictures that keep an own
    transition: "Pictures 5 and 7 keep their own transitions – change them in the picture
    editor." Then "Back to crossfade" (disabled-looking and titled "The transitions are already
    set to crossfade" while they are; the toast "Transitions back to crossfade" with "Undo"
    follows) and "Done". Done, Esc or a tap on the scrim closes it; focus starts on the checked
    tile and goes back to the row.
  - **Delete**: "Delete slideshow …" asks in a dialog, "Delete “title”?", what goes (the
    slideshow and its n pictures, not the original photos; cannot be undone), "Keep" (focused)
    and a coral "Delete"; Keep or Esc puts the focus back on the ⋯ button. Deleting first closes
    the screen's undo toast, then removes the record and the media only it uses, goes back to
    start and shows the toast "Slideshow deleted" there — also when another tab deleted it
    first. An edit to a slideshow deleted elsewhere goes back to start with the toast "This
    slideshow no longer exists."
