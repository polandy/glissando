# Order and title

- **Order**: an import sorts the pictures ascending by `capturedAt`; a tie breaks by file name,
  then input order. The stored order is always the play order; `ownOrder` only labels it as
  the user's own once they reordered the pictures.
- **Title**: the month, or month range, the pictures were captured in, formatted with
  `Intl.DateTimeFormat(locale, …).formatRange`; a title the user emptied falls back to it.
- **Distinct automatic title** (`distinctTitleForCaptureRange`): a new slideshow's automatic
  title keeps clear of the titles already in the library. It is the month title ("July 2025")
  unless a slideshow has that exact title; then, if a slideshow of the same first and last
  capture day has it, the month title numbered with the lowest free number from 2 ("July 2025 ·
  2"); otherwise the capture day range ("12–19 July 2025", numbered the same way if taken too).
  The library is the device's slideshows, plus the server's when the new slideshow goes to the
  server and the server answers. The wizard's Title field starts with this title; a blank field
  falls back to it. Editing the title in place later is unchanged: emptying it brings back the
  plain month title.
- **Title slide subtitle**: empty while the title is the month title or the capture day range
  (it would only repeat it), otherwise the capture day range (TITLE_SLIDES.md in the app docs).
