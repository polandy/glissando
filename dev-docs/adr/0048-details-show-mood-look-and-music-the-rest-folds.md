# ADR-0048: The slideshow's Details show mood, look and music; the rest folds, remembered per device

**Status:** accepted

## Context

The info panel had grown to eleven rows in three forms: cards with "Change", fact rows with a
"by mood" chip, and the switch "Follow the music's energy", which the Mood sheet holds as well
(ADR-0046). Up to 1024 px all of it sat under one "Details" toggle that was folded on every
visit, so the settings people change most took a tap each time. Mockup, option A:
`https://polandy.github.io/glissando-assets/mockups/details-panel/`.

## Decision

- **Three tiles up front, never folded:** Music, Mood and Look, in one row of three under "Play"
  at every width. Each tile is one button that opens its sheet.
- **Everything else under "Fine settings"**: Transitions, Portrait pictures and Trip chapters,
  then storage, link and "Show on TV". It is the same fold at every width, beside the pictures
  as well as above them.
- **The fold is remembered per device.** It starts folded. Opening or closing it is stored in
  the browser's storage (`localStorage`) and applies to every slideshow on that device. It is a
  view preference, not part of the slideshow, so it is neither in the `.glissando` file nor on
  the server.
- **The energy switch lives only in the Mood sheet.** While it is on, the Mood tile's summary
  says "follows the energy".
- **Derived facts go into summaries.** Picture times and the Ken Burns strength make up the Mood
  tile's summary. The picture count and the duration are in the header already. The music's
  length goes into the Music summary when it differs from the slideshow. The captions count is
  dropped.

## Options weighed

- _One fold, remembered_ — rejected: mood, look and music would hide behind a tap whenever it
  was left closed.
- _Fine settings folded on every visit_ — rejected: someone who tunes transitions would have
  to open it every time.
- _No fold beside the pictures_ — rejected: two structures for one panel, and a long panel on
  desktop too.
- _The energy switch in both places_ (as before) — rejected: two controls for one setting. The
  cost: the switch is one sheet away, and only the Mood summary shows its state.
- _Three rows instead of tiles_ (mockup option B) — rejected: the owner chose the tiles, which
  read as one group at a glance.
- _Remember the fold in the slideshow_ — rejected: a view preference would change the file and
  the server document.

## Consequences

- The panel loses the Pictures, Duration, Picture times, Ken Burns and Captions rows. Their
  information is in the header or in the Music and Mood summaries, apart from the captions count.
- The Details toggle and its `aria-expanded` move to "Fine settings". E2e cases that opened
  "Details" now open "Fine settings" (or nothing, for mood, look and music). E2E-083 covers the
  tiles, the fold's default and its state surviving a reload.
