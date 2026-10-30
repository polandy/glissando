# Preparing a server slideshow

Before a server slideshow plays, the player prepares its pictures in the quality this device
plays in ([SETTINGS.md](SETTINGS.md), ADR-0027): 1440 is Immich's preview, 4K the original made
into the display rendition on the device. Device slideshows start at once, as before.

## Flow

`player/prepare/prepare-flow.ts` (`PrepareFlow`), over `prepared-pictures.ts` (the cache) and
`preload-plan.ts` (the plan). `routes/PlayerLayer.svelte` creates it for a server slideshow,
renders `player/PreparePictures.svelte` while it measures or prepares, and the player once it
plays.

1. **Measuring**: the first two pictures (one for a one-picture slideshow) are prepared and timed.
2. **The plan**: from the time per picture (moving average of the last four) and the played
   slides' start times, `planPreload` says how many must be ready before playing (formula in
   ADR-0027). If that is no more than are ready, playing starts — for 1440 usually right after
   measuring, without the preparing stage.
3. **Preparing**: until that many are ready, in order. The target is worked out again after every
   picture, so a slower Wi-Fi raises it and the bar follows.
4. **Playing**: by itself once enough are ready, or at "Start now". Preparing goes on behind the
   slides; if it falls behind, the player shows its waiting state.

Prepared pictures are encoded renditions in a cache of at most 60, released once their slide has
passed: each slide as it comes on screen passes the picture it plays in that picture's own place
(`player/prepare/slide-pictures.ts`), a portrait pair its first one; a title or closing card
passes none. A picture asked for out of order is prepared next. ✕ and Esc close the player and
cancel the download under way.

A picture Immich answers 404 for while measuring or preparing is reported as missing and left
out of the slideshow, as on its screen; one found while playing is skipped by the player
([server_library/IN_THE_APP.md](../server_library/IN_THE_APP.md)). Any other failure while
preparing stops with "Immich isn't answering" and Close.

## Screen

Black, as the player (player tokens). Top: ✕ ("Close (Esc)") and the slideshow's title. In the
middle, at most 420 px wide: a 3:2 frame with the quality ("1440" or "4K") as a badge, then

- **Measuring**: "Checking the connection …", "Loading the first 2 pictures in 4K to measure how
  long one takes.", an indeterminate mint bar (a static, dimmed one with reduced motion), and
  "Measuring" · "1 of 2".
- **Preparing**: "Preparing pictures", "4K · a picture takes ~6 s here and is shown for 5 s. So
  the slideshow plays without stopping, Glissando prepares 7 of 30 pictures first." (the slide
  length is the slides' average), a mint bar (`role="progressbar"`, "Prepared pictures", values
  ready of target), "3 of 7 pictures" and "starts in ~0:24" in mono tabular figures, and a row of
  small squares, one per picture up to 40: ready ones mint, the ones to prepare first outlined.

Buttons: "Start now" (accent) and, only for 4K, "Play in 1440" (glass), which prepares this
playback from the previews instead, the setting untouched. Footnote: "Starts by itself once enough
pictures are ready."
