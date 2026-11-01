# Screens

- **Header** ([HEADER.md](HEADER.md)): the 56 px bar on every screen, with the export's and the
  faces-and-subjects search's progress.
- **Start** (`screens/StartScreen.svelte`): in the header a gear ("Settings", opens the
  settings sheet, [SETTINGS.md](SETTINGS.md)) and, with slideshows, "New slideshow"; the large logo while the library is empty, with the
  hero line and "New slideshow"; it also shows on a first launch over a filled library, so the
  start animation always plays; under the hero's "New slideshow" a ghost button "Open .glissando
  file". With slideshows: "Library / Your slideshows" with an "Open file" button beside it and a
  card grid —
  a cover of the first three pictures (one large, two small), the title, "12 pictures · 1:00" and a
  music icon — ending in a dashed "New slideshow" card. While the background search for the
  focus (dev-docs/library/FOCUS_SEARCH.md) has pictures of a slideshow left, its card
  adds the line "Looking for subjects · 12 of 40" (every picture already having a record:
  "Looking again · 12 of 40") over a 2 px mint hairline filling with the
  progress (`screens/FocusSearchLine.svelte`); the line and bar go once the slideshow is done. A
  slideshow done searching with pictures the pass could not look at instead keeps the line, without
  a bar: "3 pictures couldn't be looked at" (singular "1 picture couldn't be looked at"); this, too,
  goes once a later look succeeds. The card stays fully usable meanwhile; both lines show the same
  way on a device or a server card. A status bar at the bottom
  (`pwa/StatusBar.svelte`): "Offline · stored on this device", or what
  [Installing and offline](INSTALLING_AND_OFFLINE.md) says. A file dragged over the library shows
  the layer "Drop to open the slideshow"; dropped, it opens (below). With the server library on
  or offline, the library splits into "On this device" and "On your Glissando server", the
  server cards from the last list this device remembers while offline
  (server_library/IN_THE_APP.md).
- **Slideshow** (`screens/SlideshowScreen.svelte`, parts in `screens/slideshow/`): breadcrumb
  "Library / title" and a ⋯ "More" button whose menu holds "Faces and subjects …" — with a
  subtitle only once the search is done and some pictures failed ("3 couldn't be looked at"); its
  progress is background work, not the menu's — a separator and "Delete slideshow …". "Faces and
  subjects …" opens the Focus sheet (titled "Faces and subjects") (`screens/slideshow/FocusSheet.svelte`, mockup "Variant A · grid", ADR-0041): a
  bottom sheet on phone, a 440 px right panel from 720 px — a status line with the search's progress, a stacked bar and legend chips by result (filtering the grid below them, own
  motion as its own chip), a 4-column grid of the slideshow's pictures with a status dot and, on an
  own-motion one, an "Own motion" badge (tapping a tile opens the picture editor), "Try the 3 again"
  once some failed or "Look again at all 12 pictures" otherwise (asking again at every picture,
  own-motion ones included: their automatic focus is still found and shown, only not used for their
  motion), a hint once any picture has its own motion, and where the result is kept ("Stored on
  this device." or "Shared with every device on your Glissando server."); a 16:9
  cover of the first picture, the only Play control (a tap anywhere on it plays; a "▶ Play · 0:56" pill bottom left), then the pictures in play
  order, each with its order number and capture date, under "Sorted by capture date" or, once
  the user reordered, "Own order" (with "drag or tap", narrow: "tap to reorder"); right of the
  count "Add media" (narrow: "Add"; the only way in, the strip has no add tile; [ADDING_PICTURES.md](slideshow-editing/ADDING_PICTURES.md), Adding pictures). Beside it (up to 1024 px: under the play preview, above the strip's header) an
  info panel (ADR-0048, below): title with a ✎ button and, right of it, the outlined "Share" pill, date range, the Music/Mood/Look tiles and "Fine settings". A tile carries small
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
- **Share** (`screens/slideshow/share/`, share_link/IN_THE_APP.md): the info panel's Share button
  opens a chooser with the groups "Watch by link" (link row, only with a server library) and "Save
  a copy" (Video, Web page, Glissando file); a row opens its sheet in place of the chooser, whose
  Back control returns to it, and Close gives the focus back to the Share button. The file row's
  subtitle reads "A .glissando file, about 184 MB" (a server slideshow: its Immich hint), measured
  when the sheet opens, again only after its pictures or music changed.
- **Glissando file sheet** (`share/GlissandoFileSheet.svelte`): name, facts, size and "Save file",
  which starts the export below; then progress, "Saved to Downloads." with "Done", or "Try again".
  Saving is disabled while another slideshow exports.
- **Export** (`glissando-file/export-job.ts`): runs in the background, one at a time; the app
  stays usable, also on other screens. While it runs, the chooser's file row reads
  "Exporting … 34 %" (for another slideshow: "Once the running export is
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

The info panel (ADR-0048, mockup option A:
`https://polandy.github.io/glissando-assets/mockups/details-panel/`) holds, top to bottom:

- **Header**: title and "date range" (the stacked card leaves the date range out). Play is the cover's alone.
- **Three tiles**, one row of three at every width and never folded. Each tile is one button
  with a small label and a chevron, the value and a summary, and opens its sheet:
  - **Music**: "3 songs" (or the song's name), with "11:20 of music" underneath when the music's
    length differs from the slideshow's. Without music: "None" and "Add music".
  - **Mood**: the mood's name, with one short phrase underneath ("Slow, soft", "Quick, on the
    beat", "Your settings" under Custom). The derived numbers (picture times, beats, motion,
    "follows the energy") are in the Mood sheet's summary box only.
  - **Look**: the look's name beside a swatch of it.
- **"Fine settings"**: a toggle (`aria-expanded`) at every width, folded until opened. Its state
  is remembered on the device for every slideshow. It opens Transitions and Portrait pictures as
  rows (label, value, summary, chevron; the whole row opens the sheet) and Trip chapters as an
  inline switch row with a one-line helper (the slideshow-wide automatic-chapters switch), then
  storage and "Show on TV". E2E-083 shows the three tiles up front, folds Fine
  settings away by default, and checks its open or closed state survives a reload.

Up to 1024 px wide (a container query on `.screen`) the layout stacks: the play preview, then
the panel as a compact card, then the strip's header and the strip, so Play and the first row of
tiles share a phone screen (390 x 844, with "More settings" closed or open). The card is one
title row (the title and "Share"; no eyebrow, no date range), the Music/Mood/Look tiles
shrunk to chips (icon, small uppercase label, the value in at most two lines; only Mood keeps
its phrase) and the "More settings" row.
