# Title cards

A **card** is the title or closing text that the player draws over a slide (ADR-0032). It is
drawn in screen space and does not move with the Ken Burns motion, like a caption (ADR-0007).
Its look and timing live with the player (`card-layout.ts`, `card-timing.ts`). Both renderers
and the editor's preview use the same numbers. Mockup:
https://polandy.github.io/glissando-assets/mockups/title-slides/.

## Contract

```json
{
  "image": { "src": "pictures/1.jpg", "capturedAt": "2026-06-01T10:00:00Z" },
  "durationMs": 9400,
  "kenBurns": { "…": "…" },
  "card": {
    "title": "Summer at the Lake",
    "subtitle": "June 2026",
    "style": "modern",
    "position": "centre",
    "ink": "light",
    "veil": { "amount": 0.6, "tint": "#2A2340" },
    "enterAtMs": 0,
    "revealAtMs": 2400
  }
}
```

A **ground slide** has `"ground": "#2A2340"` (a `#RRGGBB` colour) in place of `image` and
`kenBurns`. It must carry a `card` and cannot have a `partner`, `fit` or `caption`.

- `title`: required. It follows the caption rule (1 to 80 graphemes, a single line, no outer or
  repeated whitespace). `subtitle` is optional and follows the same rule.
- `style`: one of `modern`, `quiet`, `bold`, `classic`. `position`: `centre` or `bottom-left`.
- `ink`: `light` or `dark`, the text colour. The composer chooses it for contrast, so the
  player does not guess.
- `veil` (picture slides only, optional): `amount` is from 0 to 1 and `tint` is `#RRGGBB`. An
  absent veil means no veil.
- `enterAtMs` (default 0) is where the card starts, in slide time. `revealAtMs` (picture slides
  only, optional) is where the text dissolves and the veil lifts. It must come at least
  `CARD_ENTER_MS` after `enterAtMs` and at least `CARD_REVEAL_MS` before the slide's end.
- A `veil` on a card that starts after 0 **veils in**: the slide shows the bare picture until
  `enterAtMs`, then the veil settles in with the text.
- Slideshow `endFadeMs` (optional, positive and no longer than the last slide): over the last
  `endFadeMs` of the show, the whole frame fades to black. The final frame is black.
- Every fault is a `SlideshowFormatError` at its path, for example `slides[0].card.revealAtMs`.

## Timing (slide time `t`, eased cubic in-out unless named)

| Phase  | When                                     | What                                                |
| ------ | ---------------------------------------- | --------------------------------------------------- |
| enter  | `enterAtMs` … `+ CARD_ENTER_MS` (800)    | text opacity 0 → 1, drift 0.4 em → 0 (ease-out)     |
| veil   | with enter if it veils in, else from 0   | veil 0 → `amount` over `CARD_VEIL_MS` (1400)        |
| reveal | `revealAtMs` … `+ CARD_REVEAL_MS` (1400) | text opacity 1 → 0 with drift 0 → −0.3 em; veil → 0 |
| end    | last `endFadeMs` of the show             | the frame mixes to black                            |

A caption on a slide with a card has opacity `1 − text opacity`, so it appears once the reveal
has run and fades out as a closing card comes in. Under reduced motion, the drift is 0 and every
fade takes `CARD_REDUCED_FADE_MS` (400).

## Look

Sizes are fractions of the stage height `h`. Lines are broken between words into at most two
lines (three for `bold`), each no wider than 80 % of the stage width. A line that still does not
fit shrinks the whole title until it fits, down to half its size. Past that, the title ends in
"…" (`breakCard`, pure, measured through an injected `measure`, like `breakCaption`).

| Style     | Title                                              | Subtitle                         |
| --------- | -------------------------------------------------- | -------------------------------- |
| `modern`  | Bricolage Grotesque 700, 0.11 h, tracking −0.01 em | Instrument Sans 500, 0.05 h      |
| `quiet`   | Instrument Sans 400, uppercase, 0.065 h, +0.18 em  | Instrument Sans 400, 0.032 h     |
| `bold`    | Bricolage Grotesque 700, 0.16 h, line height 0.95  | Geist Mono 500, 0.065 h          |
| `classic` | Instrument Serif 400, 0.12 h                       | Instrument Serif italic, 0.055 h |

- The subtitle is set 0.35 of the title size below the title.
- `centre`: the block is centred both ways, with each line centred. `bottom-left`: the block is
  left aligned, 7 % of the width from the left and 9 % of the height from the bottom.
- `bold` is always left aligned. With `centre`, its block is centred vertically, at the same
  left margin as `bottom-left`.
- Ink `light` is `#FFFFFF` with a soft shadow. Ink `dark` is `#2A2340` without a shadow.
- **Veil** at amount `a`, on the picture's colour `c`:
  1. Mix toward the blurred backdrop (ADR-0028) by `a`.
  2. Desaturate by `0.6 a`.
  3. Pull the contrast toward mid grey by `0.35 a`.
  4. Mix toward `tint` by `0.35 a`.

## Composition (stored → slides)

The stored title slide and closing slide (`openingCard`, `closingCard`, see
[GLISSANDO_FILE](../library/GLISSANDO_FILE.md)) become cards in `composeSlideshow`. A card
whose title is empty is not composed. The card durations are fixed: the pictures share the rest
of the music, as for any slide with its own duration.

- **Beats.** With music, each moment below is snapped to the nearest beat at or after the
  minimum (`snapToNextBeat`). Without music, the nominal values apply.
- **Title slide on a colour:** a ground slide of `CARD_SLIDE_MS` (4000). Its transition into
  the first picture is the slideshow's transition.
- **Title slide on a picture, with reveal:** `revealAtMs` is the beat at or after
  `CARD_HOLD_MS` (2500). The **lead** is `revealAtMs + CARD_REVEAL_MS`.
  - If the picture is the first picture in the show's order **and** is not paired into a
    portrait slide with another one, the first slide carries the card, and the lead is added to
    its own duration.
  - Otherwise, a slide of that picture comes first, with its automatic Ken Burns. Its duration
    is the lead plus `CARD_ALONE_MS` (1500).
- **Title slide on a picture, without reveal:** a slide of that picture lasting
  `CARD_SLIDE_MS`, with the card for its whole duration.
- **Closing slide on a colour:** a ground slide of `CARD_SLIDE_MS + CARD_END_FADE_MS` (1500),
  with `endFadeMs = CARD_END_FADE_MS`.
- **Closing slide on a picture, fade in on:**
  - If the picture is the last picture **and** is not paired into a portrait slide, the last
    slide carries the card. Its `enterAtMs` is the slide's own duration.
    `CARD_SLIDE_MS + CARD_END_FADE_MS` is added to the slide.
  - Otherwise, a slide of that picture comes last, with `enterAtMs` = `CARD_ALONE_MS` and a
    duration of `CARD_ALONE_MS + CARD_SLIDE_MS + CARD_END_FADE_MS`.

  In both cases the show gets `endFadeMs`. **Fade in off:** the veil and the text are there
  from the slide's start (`enterAtMs` 0), and the added duration drops `CARD_ALONE_MS`.

- **Music** with a closing slide: the last track's fade-out ends at the show's end and lasts at
  least `endFadeMs`.
- **Ink:** `light` unless the ground (or the veil's tint at full amount) has a relative
  luminance above 0.5.
- **Tint:** `#2A2340` (plum). Picture-derived tints come later.
