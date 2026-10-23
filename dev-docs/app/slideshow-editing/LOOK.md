# Look

The slideshow's colour grade (ADR-0044; table and maths in `dev-docs/player/LOOKS.md`). Mockup,
option A: `https://polandy.github.io/glissando-assets/mockups/slideshow-looks/`.

- **Row**: the info panel's "Look" row sits under "Transitions" and shows the look's name as
  plain text, like the transitions row, with "default" underneath for None and no summary for
  any other look, and "Change", which opens the sheet.
- **Sheet** (`slideshow/LookSheet.svelte`): modal like the transitions sheet (bottom sheet up to
  720 px wide, a centred dialog above, over a scrim), title "Look" and a state pill with
  the look's name, accent-tinted for any look but None.
  - **Preview**: one picture of the slideshow (the first one; a video shows its poster) large,
    with its caption over it in the caption style, ungraded. The look is applied with the DOM
    renderer's SVG filter from the same table, so it matches the player. A "Hold to compare"
    button over it shows the original while pressed (pointer or Space/Enter held); it is left out
    for None.
  - **Picture row**: up to the first four pictures as small buttons, the look applied; a tap shows
    that picture in the preview and in the tiles (`aria-current` on the shown one). Left out with
    one picture.
  - **Tiles**: a radiogroup of seven tiles in the order of the table — None, Warm, Cool, Vivid,
    Film, Black & white, Faded — each the preview picture with that look and its name; None
    carries the tag "Default". Four columns, three below 480 px. A tap stores at once; the arrow
    keys move it (selection follows focus).
  - **Hint**: "Applies to every picture and video in this slideshow, also in the exported video
    and web page. Title and closing slides and captions stay as they are."
  - **Footer**: "Back to None" (disabled-looking and titled "The slideshow has no look" while it
    has none; the toast "Look back to None" with "Undo" follows) and "Done". Done, Esc or a tap on
    the scrim closes it; focus starts on the checked tile and goes back to the row.
  - **No pictures**: the preview and picture row are left out and each tile is a plain swatch
    with the name.
- **Strip**: the slideshow's picture tiles show the look too (same filter); the title and closing
  card tiles do not.
- **Stored** as `StoredSlideshow.look` through `setSlideshowLook` (`STORAGE_LAYOUT.md`), saved at
  once like every edit, with the editor's undo for "Back to None".
