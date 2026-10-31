# UX backlog — Slideshow screen

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Screen: `src/app/screens/SlideshowScreen.svelte`,
its side panel and the strip.

### UX-01 Phone layout puts the settings card above the pictures (size M)

Problem — On a phone the first viewport shows the header, the "Slideshow" card (title, Share,
the Music / Mood / Look tiles, the Fine settings fold) and the preview with Play; the picture
strip starts below the fold, and with Fine settings open it is a full screen down. The
pictures, the thing the user edits most, sit under the thing they touch rarely.

Where — Slideshow screen, phone 390×844: Play is visible at about 540 px with the fold closed
(so Play itself is not the problem); the strip head is at the bottom edge or below. Selecting a
picture auto-scrolls the page to bring the selection bar in, which adds motion. On desktop the
preview is on the left and the settings on the right, which is fine.

Why — "Every screen has one obvious next step" (SCOPE.md). Priority order on a long phone page
should follow frequency of use: play, pictures, then settings.

Proposal — Keep the preview with Play first. Variant A: collapse the settings card on narrow
layouts to its title row plus one row of three chips (Music · Mood · Look) with Fine settings
behind a "More" row, so the strip moves up by a card height. Variant B: preview, strip, then
the full card. Both in one mockup page with the UX-05/06 selection bar, since they share the
screen.

Done when — At 390×844 the Play button and at least one row of pictures are visible without
scrolling, with Fine settings open or closed; a browser test asserts both; the e2e phone flow
still passes.

### UX-02 "Slideshow created" toast covers the strip and the selection bar (size S)

Problem — Right after creating, the toast "Slideshow created · tap Play" sits over the lower
part of the screen where the strip and, after a tap, the selection bar appear. The user's
first action (tap a picture) competes with dismissing the toast.

Where — Slideshow screen directly after the music step, phone. Toasts are bottom-anchored
(`src/app/toast`), one at a time, 6 s.

Why — Feedback should not hide the next control. The toast duplicates what the screen already
shows (the Play button is the obvious next step).

Proposal — Drop the toast after creation; the screen itself is the confirmation. If a signal
is wanted, pulse the Play button once (respecting reduced motion). Separately: when a
selection bar is open, move any toast above it.

Done when — No toast after creation; a toast raised while the selection bar is open does not
overlap it (browser test with bounding boxes).

### UX-03 Mood tile text wraps to four lines (size S)

Problem — The Mood tile reads "Calm / ~6.9 s · 12 beats · gentle motion" and wraps to 3–4
lines in a tile a third of the phone width; in the desktop side panel it wraps the same way.
The numbers explain mechanics the user did not ask about and make the three tiles uneven.

Where — Slideshow screen, settings card, Mood tile; Custom reads "automatic · standard
motion", also wrapped.

Why — A summary tile carries one state word; detail belongs in the sheet. Uneven tile heights
read as a layout bug.

Proposal — Tile subtitle: one short phrase matching the sheet's own labels ("Slow, soft",
"Quick, on the beat", "Your settings"). Show the derived numbers (picture time, beats) in the
Mood sheet's summary box only, where they already are.

Done when — Each of Music / Mood / Look fits in two lines at 390 px and in the desktop side
panel; a browser test asserts tile heights are equal.

### UX-04 Several slideshows get the same automatic title (size M)

Problem — The title is derived from the capture-date range ("July 2025"). Three slideshows of
the same month are indistinguishable in the library; the cards also share the same first
picture when made from the same folder.

Where — Start screen library with three cards "July 2025", seen in the tour.

Why — Recognition over recall: a list item must be identifiable without opening it.

Proposal — Options for the mockup: (a) ask for a title as the last step of creation, prefilled
with the date range, Enter keeps it; (b) auto-disambiguate ("July 2025 · 2") and show "N
pictures · created <date>" on the card; (c) both. The user guide says the title is editable in
place; keep that.

Done when — Two slideshows created from the same dates are told apart on the library card
without opening either; e2e covers the chosen path.

### UX-27 "Trip chapters" opens a sheet for a single switch (size S)

Problem — In Fine settings the Trip chapters row opens a sheet that holds one switch and a
helper paragraph ("Automatic: a new chapter when the pictures jump a day or a place"). Two taps
and a modal for one on/off decision, while the neighbouring rows in the same fold are inline.

Where — Slideshow screen → Fine settings → Trip chapters; `FineSettings.svelte`,
`chapter-sheet/ChapterSheet.svelte` (general mode, `chapters.sheetTitleGeneral`).

Why — Fewest controls at a time means the fewest layers, too; a sheet earns its place when it
holds a choice, not a toggle.

Proposal — Make Trip chapters an inline switch row in Fine settings, helper shortened to one
line. The per-chapter sheet (title, delete) stays as it is.

Done when — The general chapter sheet is gone; the switch is reachable in one tap from the open
fold; browser test toggles it and checks the chapter markers in the strip.
