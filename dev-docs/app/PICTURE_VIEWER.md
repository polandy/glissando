# Picture viewer — a picture full screen in the pictures step

Mockup (variant C, approved): https://polandy.github.io/glissando-assets/mockups/picture-fullscreen/

A tile's thumbnail is too small to judge a picture, so the pictures step ([IMPORT_WIZARD.md](IMPORT_WIZARD.md); the
same body serves "Add media") shows one full screen on request (`import/PictureViewer.svelte`).

- **Open**: the whole tile of a strip picture and of a set-aside picture (also the kept one of a similar group) is
  a button, "View picture from <date> at <time>" (`ViewPictureButton.svelte`, cursor zoom-in). The ✕ and + keep
  their own targets above it.
- **The view**: a modal dialog over the step on the player's black, labelled "Picture from <date>"; the picture
  fitted, never cropped, as the slideshow will show it (`loadPicture`: the display rendition on the device,
  Immich's preview for a linked server picture), the thumbnail standing in until it has loaded. The picture shown
  and its two neighbours are loaded; the rest are released. Top: ✕ close, "<date> · <time>", "n of m" (and "Set
  aside: Similar|Blurry"). A tap on the picture hides and shows the bars. A filmstrip of every picture's thumbnail
  at the bottom jumps to one and marks the shown one.
- **Order** (`import/picture-viewer-view.ts`): the strip's pictures, then the set-aside ones group by group. ← / →,
  the side arrows (fine pointers) and a horizontal swipe step through them; the ends do not wrap.
- **Deciding**: a strip picture offers "Remove" (also Delete / Backspace): the same removal as ✕ with the same
  "Picture removed" · "Undo" toast, which stays above the viewer; the next picture is shown, the previous at the
  end, and the viewer closes when none is left. A set-aside picture offers "Take in" (as +) and stays shown, now
  an ordinary picture.
- **Closing**: ✕ or Esc; focus goes to the shown picture's tile, else the one opened. Tab stays inside the
  dialog. The fade is dropped with reduced motion.
