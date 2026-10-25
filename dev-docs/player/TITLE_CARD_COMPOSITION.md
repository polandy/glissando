# Title card composition (stored → slides)

The stored title slide and closing slide (`openingCard`, `closingCard`, see
[GLISSANDO_FILE](../library/GLISSANDO_FILE.md)) become cards in `composeSlideshow`. A card
whose title is empty is not composed. The card durations are fixed: the pictures share the rest
of the music, as for any slide with its own duration.

- **Beats.** With music, each moment below is snapped to the nearest beat at or after the
  minimum (`snapToNextBeat`). Without music, the nominal values apply. The lead carries forward
  into every later picture's own beat snap too (`DURATIONS.md`, "On the beat"): a boundary after
  the card or the merged-onto slide lands on the beat it really falls on, not the beat it would
  fall on without the lead.
- **Title slide on a colour:** a ground slide of `CARD_SLIDE_MS` (4000). Its transition into
  the first picture is the slideshow's transition.
- **Title slide on a picture, with reveal:** `revealAtMs` is the beat at or after
  `CARD_HOLD_MS` (2500). The **lead** is `revealAtMs + CARD_REVEAL_MS`.
  - If the picture is the first picture in the show's order **and** is not paired into a
    portrait slide with another one, the first slide carries the card, and the lead is added to
    its own duration. A **video** slide (`VIDEO_SLIDES.md`) is never lengthened this way: the
    card merges onto it only if the reveal still ends before the slide hands over to the next
    one, i.e. `revealAtMs + CARD_REVEAL_MS <= durationMs − (transitionToNext?.durationMs ?? 0)`.
    Otherwise it falls back to the next rule, with the clip itself left untouched.
  - Otherwise, a slide of that picture comes first, with its automatic Ken Burns. Its duration
    is the lead plus `CARD_ALONE_MS` (1500).
- **Title slide on a picture, without reveal:** a slide of that picture lasting
  `CARD_SLIDE_MS`, with the card for its whole duration.
- **Closing slide on a colour:** a ground slide of `CARD_SLIDE_MS + CARD_END_FADE_MS` (1500),
  with `endFadeMs = CARD_END_FADE_MS`.
- **Closing slide on a picture, fade in on:**
  - If the picture is the last picture **and** is not paired into a portrait slide, the last
    slide carries the card. Its `enterAtMs` is the slide's own duration.
    `CARD_SLIDE_MS + CARD_END_FADE_MS` is added to the slide. A **video** slide keeps its own
    `durationMs` instead: `enterAtMs` is `durationMs − CARD_SLIDE_MS − CARD_END_FADE_MS`, and the
    card merges only if that is at or after the transition into the slide (the previous slide's
    `transitionToNext?.durationMs ?? 0`). Otherwise it falls back to the next rule, with the
    clip itself left untouched.
  - Otherwise, a slide of that picture comes last, with `enterAtMs` = `CARD_ALONE_MS` and a
    duration of `CARD_ALONE_MS + CARD_SLIDE_MS + CARD_END_FADE_MS`.

  In both cases the show gets `endFadeMs`. **Fade in off:** the veil and the text are there
  from the slide's start (`enterAtMs` 0), and the added duration drops `CARD_ALONE_MS`. A video
  slide with fade in off always merges: it is already covered from the first frame.

- **Music** with a closing slide: the last track's fade-out ends at the show's end and lasts at
  least `endFadeMs`.
- **Ink:** `light` unless the ground (or the veil's tint at full amount) has a relative
  luminance above 0.5.
- **Tint** by the stored card's `tint`: `picture` takes the background picture's veil colour
  ([picture colours](TITLE_CARD_COLOURS.md)), `light` is cream `#FFF3E2`, `dark` is plum
  `#2A2340`.
- **Entrance:** the stored card's, unchanged.
