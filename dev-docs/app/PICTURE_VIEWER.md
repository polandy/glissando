# Picture viewer — a picture full screen

Mockup (variant C, approved): https://polandy.github.io/glissando-assets/mockups/picture-fullscreen/

A tile's thumbnail is too small to judge a picture, so the pictures step ([IMPORT_WIZARD.md](IMPORT_WIZARD.md); the
same body serves "Add media") and the slideshow editor show one full screen on request
(`components/PictureViewer.svelte`).

- **Open**: in the pictures step, View in the selection bar, F on a focused strip tile, a double-click with a
  mouse ([IMPORT_ARRANGING.md](IMPORT_ARRANGING.md)); the whole tile of a set-aside picture (also the kept one of a
  similar group) is a button, "View picture from <date> at <time>" (`ViewPictureButton.svelte`, cursor zoom-in),
  its + keeping its own target above it. In the editor, F on a focused tile (a double-click and Edit still open
  the picture editor); the editor's viewer shows the slideshow's pictures in play order, without set-aside ones.
- **The view**: a modal dialog over the step on the player's black, labelled "Picture from <date>"; the picture
  fitted, never cropped, as the slideshow will show it (`loadPicture`: the display rendition on the device,
  Immich's preview for a linked server picture), the thumbnail standing in until it has loaded. The picture shown
  and its two neighbours are loaded; the rest are released. Top: ✕ close, "<date> · <time>", "n of m" (and "Set
  aside: Similar|Blurry"). A tap on the picture hides and shows the bars. A filmstrip of every picture's thumbnail
  at the bottom jumps to one and marks the shown one.
- **Order** (`import/picture-viewer-view.ts`): the strip's pictures, then the set-aside ones group by group. ← / →,
  the side arrows (fine pointers) and a horizontal swipe step through them; the ends do not wrap.
- **Deciding**: a strip picture offers "Remove" (also Delete / Backspace): the same removal as ✕ with the same
  "Picture removed" · "Undo" toast (in the editor its removal, so the last picture stays), which stays above the viewer; the next picture is shown, the previous at the
  end, and the viewer closes when none is left. A set-aside picture offers "Take in" (as +) and stays shown, now
  an ordinary picture.
- **Closing**: ✕ or Esc; focus goes to the shown picture's tile, else the one opened; in the strip a single
  selection moves to the shown picture. Tab stays inside the
  dialog. The fade is dropped with reduced motion.
