# ADR-0033: A picture's colours are worked out once and stored with the picture

**Status:** accepted

## Context

A title or closing card over a picture tints its veil (ADR-0032). The tint was a fixed plum,
which looks foreign on a warm sunset or a green forest. The card sheet also offers colour
grounds, and colours from the slideshow's own pictures suit it better than the six fixed
swatches alone. Both need colours taken from a picture's pixels
([TITLE_CARD_COLOURS](../player/TITLE_CARD_COLOURS.md)). The composer that
turns a stored card into a player card is pure and synchronous, and it runs for every target:
playback, the video export, the HTML export, the share page and the TV.

Options weighed:

1. **Work the colours out on every compose**: read and decode the card's picture before each
   compose. The file format stays as it is, but every caller of the composer gains an async
   picture read at its edge, and the editor's preview waits for a decode on each change.
2. **Store the picked tint on the card only**: the editor works out the colour when a picture is
   chosen. But a card whose picture is removed moves to another picture in pure library code,
   with no pixels at hand, so its tint goes stale.
3. **Work the colours out once when a picture is added and store them with the picture.** The
   composer stays pure and every target gets the same colour. The cost is a new field on every
   stored picture, a new `.glissando` version, and work on every add.

## Decision

Option 3. Every stored picture carries `colours: { veil, accent }`, worked out by the pure
`pictureColours` from the stored, downscaled picture's pixels as it is added, on every path
that adds a picture (files, Immich, a `.glissando` import, the server). The composer reads the
card picture's `veil` for a `picture` tint, and the sheet offers the first or last picture's
`veil` and `accent` as colour swatches. A swatch that was picked is stored as its hex.

## Consequences

- The `.glissando` file goes to version 13, and the server document with it. Older files are
  refused, and dev databases are cleared (no instance predates this).
- Adding a picture samples at most 64 × 64 of its pixels once more. That is small next to the
  downscaling it follows.
- A change to the `pictureColours` algorithm affects only pictures added after it. Pictures
  added before keep their stored colours.
