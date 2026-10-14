# Screens

- **Header** (`components/Header.svelte`): a 56 px bar. On the start screen the logo mark and
  the "Glissando" wordmark; elsewhere the back arrow and the breadcrumb (earlier crumbs hidden up
  to 720 px wide, the current one ellipsised; the root crumb is "Library"); a right-hand slot for
  the screen's own buttons. While an export runs, on every screen: a progress ring and "Exporting
  “title” … 34 %" before the buttons (the label hidden up to 720 px, the ring stays) and a 3 px
  mint line along the bar's bottom edge growing with the progress.
- **Start** (`screens/StartScreen.svelte`): in the header a gear ("Settings", opens the
  settings sheet, [SETTINGS.md](SETTINGS.md)) and, with slideshows, "New slideshow"; the large logo while the library is empty, with the
  hero line and "New slideshow"; it also shows on a first launch over a filled library, so the
  start animation always plays; under the hero's "New slideshow" a ghost button "Open .glissando
  file". With slideshows: "Library / Your slideshows" with an "Open file" button beside it and a
  card grid —
  a cover of the first three pictures (one large, two small), the title, "12 pictures · 1:00" and a
  music icon — ending in a dashed "New slideshow" card. While the background search for the
  focus (dev-docs/library/FOCUS_SEARCH.md) has pictures of a slideshow left, its card
  adds the line "Looking for subjects · 12 of 40" over a 2 px mint hairline filling with the
  progress (`screens/FocusSearchLine.svelte`); both go once the slideshow is done, and the card
  stays fully usable meanwhile. A status bar at the bottom
  (`pwa/StatusBar.svelte`): "Offline · stored on this device", or what
  [Installing and offline](INSTALLING_AND_OFFLINE.md) says. A file dragged over the library shows
  the layer "Drop to open the slideshow"; dropped, it opens (below). With the server library on
  or offline, the library splits into "On this device" and "On your Glissando server", the
  server cards from the last list this device remembers while offline
  (server_library/IN_THE_APP.md).
- **Slideshow** (`screens/SlideshowScreen.svelte`, parts in `screens/slideshow/`): breadcrumb
  "Library / title" and a ⋯ "More" button whose menu holds "Export" (subtitle "A .glissando
  file, about 184 MB", measured when the menu opens, again only after its pictures or music changed), a separator and "Delete slideshow
  …"; a 16:9
  preview of the first picture (tap plays) with the running time, then the pictures in play
  order, each with its order number and capture date, under "Sorted by capture date" or, once
  the user reordered, "Own order" (with "drag or tap", narrow: "tap to reorder"); right of the
  count "Add pictures" (narrow: "Add"; [ADDING_PICTURES.md](slideshow-editing/ADDING_PICTURES.md), Adding pictures). Beside it an
  info panel: title with a ✎ button, date range (earliest to latest capture), "Play", below it
  the "Save as" row with "Video" (the video export sheet, `dev-docs/VIDEO_EXPORT.md`) and "Web
  page" (the web page export sheet, `dev-docs/HTML_EXPORT.md`) side by side, and the
  facts — pictures, duration (with "· music 0:44" beside it, muted, when the slideshow does not
  end with the music's excerpt), music (with music a button spanning the row: the file name,
  below it "whole track", or once changed in the music editor "0:12–2:30 · fades in and out",
  and "Edit ›"; it opens the music editor ([MUSIC_EDITOR.md](MUSIC_EDITOR.md)); without music the plain "No music"), picture times "automatic" (with own durations "automatic, 1
  own"), Ken Burns "automatic" (with own motions "automatic, 2 own"), transitions (a button
  spanning the row like the music's: the effect, e.g. "Crossfade" or "Alternating", below it
  "default" or "own choice", with own transitions "· 2 own" — a last picture's stored one does
  not count — and "Change ›"; it opens the transitions sheet ([RENAME_TRANSITIONS_DELETE.md](slideshow-editing/RENAME_TRANSITIONS_DELETE.md), Transitions)), portrait pictures (a button spanning the row: "Automatic", "One at a time" or "Fill
  the screen", below it "· 2 pairs" once any slide pairs two portrait pictures, and "Change ›";
  it opens the portrait pictures sheet ([RENAME_TRANSITIONS_DELETE.md](slideshow-editing/RENAME_TRANSITIONS_DELETE.md), Portrait pictures), ADR-0028), captions "3 of 8" (pictures with a caption of all; none: "0 of 8"). A tile carries small
  badges bottom right: a frame "own" for an own motion, a clock with "8 s" for an own duration,
  a transition mark (titled with the effect, e.g. "Circle") for an own transition, except on
  the last picture, "shown alone" for a picture set never to pair and "blurred fill" for one
  shown whole over a blurred copy of itself; a pair's two tiles are joined by a peach bar below
  them (ADR-0028). Its label adds "own motion", "own duration 8 s", "own transition Circle" and,
  paired, "shown as a pair with picture 4", "shown alone" and "over a blurred fill". The info panel and the player always use the edited picture list.
  A slideshow opened by id is looked up on the device first, then taken for a server slideshow
  (`routes/slideshow-home.ts`); a server slideshow's screen adds where it lives, its missing
  pictures and its own ⋯ menu, and its edits are saved on the server
  (server_library/IN_THE_APP.md).
- **Export** (`glissando-file/export-job.ts`): runs in the background, one at a time; the app
  stays usable, also on other screens. While it runs, the menu item is `aria-disabled` and reads
  "Exporting … 34 %" (for another slideshow: "Export", subtitle "Once the running export is
  done"). At the end the browser downloads "title.glissando" and the toast "“title.glissando”
  downloaded · 184 MB" follows. A device out of storage or memory ends it with the coral toast
  "Export failed: not enough storage on the device." and "Try again"; any other failure is an
  unexpected error.
- **Open a .glissando file** (`glissando-file/open-flow.ts`): from the library ("Open file",
  the hero's button, a drop), import step 1 (below), or a double-click on the file on the desktop
  (below). It blocks under the overlay "Opening
  slideshow …" with a bar, the line "Checking file …", then "Picture 12 of 48", then "Music",
  the file name and "Cancel". Then the new slideshow's screen opens with the toast "“title”
  opened", or, when the title was taken, "Opened as “title (2)”, “title” stays unchanged."
  Cancel ends with the toast "Opening cancelled, nothing saved." A refused file is a coral
  notice with a ✕ at the top of the screen it was opened from, gone when that screen is left:
  - foreign: "“name” is not a Glissando slideshow." — "Choose another file" and, in the
    library, "New slideshow";
  - damaged or incomplete: "“name” is damaged." — "Choose another file";
  - newer: "“name” comes from a newer Glissando version." — "Reload app";
  - too large: "Not enough storage." with "needs 2.1 GB, this device has 640 MB free" (without
    the numbers where the browser cannot tell the free space) — "Choose another file". A
    storage running full while writing ends the same way, after everything written is removed.
- **Import** (`import/`, [IMPORT_WIZARD.md](IMPORT_WIZARD.md)) and the **player** ([PLAYER_OVERLAY.md](PLAYER_OVERLAY.md)) open from these.
- **Picture frame** (`frame/`, [FRAME.md](FRAME.md)): a "Picture frame" card on the start screen
  while the server library is on (it can be hidden with its ✕ and is brought back in Settings),
  its set-up screen and the fullscreen running frame.

Up to 720 px wide (a container query on `.screen`) the layout narrows: one card column, the
info panel below the preview, three tiles per row.
