# Slideshow JSON

The wire contract shared by player, app and server. `parseSlideshow` validates untrusted JSON
and throws `SlideshowFormatError` naming the path, the bad value and what to set; unknown keys
are rejected.

```json
{
  "formatVersion": 9,
  "look": "film",
  "title": "July 2025",
  "music": [
    {
      "src": "music/summer.mp3",
      "atMs": 0,
      "startMs": 12000,
      "endMs": 150000,
      "fadeInMs": 2000,
      "fadeOutMs": 3000,
      "gain": 1
    },
    {
      "src": "music/autumn.mp3",
      "atMs": 135000,
      "startMs": 0,
      "endMs": 90000,
      "fadeInMs": 3000,
      "fadeOutMs": 2000,
      "gain": 1.26
    }
  ],
  "slides": [
    {
      "image": { "src": "pictures/1.jpg", "capturedAt": "2025-07-01T10:00:00Z" },
      "durationMs": 5000,
      "kenBurns": {
        "from": { "zoom": 1, "centerX": 0.5, "centerY": 0.5 },
        "to": { "zoom": 1.2, "centerX": 0.4, "centerY": 0.6 },
        "easing": "ease-in-out"
      },
      "partner": {
        "image": { "src": "pictures/2.jpg", "capturedAt": "2025-07-01T11:00:00Z" },
        "kenBurns": {
          "from": { "zoom": 1, "centerX": 0.5, "centerY": 0.4 },
          "to": { "zoom": 1.2, "centerX": 0.5, "centerY": 0.4 },
          "easing": "linear"
        }
      },
      "caption": "Evening on the jetty",
      "fit": "cover",
      "transitionToNext": { "effect": "crossfade", "durationMs": 1000 }
    }
  ]
}
```

- **Order**: slides play in array order, which starts as capture order (`capturedAt`) and follows
  the user's reordering. `music` is optional.
- **Durations** are positive whole milliseconds.
- **Ken Burns**: a framing is `zoom` (≥ 1, where 1 is crop-to-fit) and a centre in picture
  coordinates (0..1 from the top left). It is independent of the screen's aspect ratio. Near
  an edge the crop stops at the picture's border. Easings: `linear`, `ease-in`, `ease-out`,
  `ease-in-out` (cubic).
- **Transitions**: `crossfade`, `push-left`, `wipe-right`, `circle-open`, `zoom-in`,
  `dissolve`. A missing `transitionToNext` is a hard cut; the last slide has none.
- **Caption** (optional): one line of 1 to 80 characters (counted in graphemes, so an emoji, a
  flag or a letter with a combining mark is one) without leading, trailing or repeated
  whitespace, as `normalizeCaption` leaves typed text; absent means none. Anything else is a
  `SlideshowFormatError` at `slides[i].caption`.
- **Music** (version 3, ADR-0009, ADR-0023): a non-empty list of tracks in order of `atMs`, the
  slideshow time where each starts; two overlap in a crossfade. Per track, `startMs` is where in
  the track playing starts, `endMs` where it stops being heard, `fadeInMs` and `fadeOutMs` ramp
  the volume up from `startMs` and down to `endMs` (0: none); all whole milliseconds of the
  track, `endMs` after `startMs`, the two fades together at most `endMs − startMs`. The composer
  resolves them, leaving out the songs the slideshow never reaches: the player knows no
  "automatic", no "whole track" and no crossfade rule. Errors name the track, e.g.
  `music[1].atMs`.
- **`gain`** (version 8, ADR-0040, required): linear, greater than 0 and finite; the composer's
  own-loudness levelling, which the player and the video export each multiply into the track's
  fade envelope. `1` is unlevelled (no measured loudness, or already at the target).
- **`partner`** (version 4, ADR-0028, optional): the second picture of a composed portrait pair,
  drawn right of `image` on a landscape screen and below it on a portrait one, each cropped to
  cover its half; its own `kenBurns` moves within its own half, never panning horizontally
  relative to the first (`from.centerX` equals `to.centerX` on both). Validated strictly, like
  `image` and `kenBurns`; errors name the field, e.g. `slides[i].partner.image.src`.
- **`fit`** (version 4, ADR-0028, optional): `"cover"` turns the blurred fill off for the slide,
  so every picture crops as a single picture always did; absent, a whole picture that covering
  would crop too much of is drawn over a blurred, darkened copy of itself instead. No other value
  is accepted.
- **`card`, `ground`, `endFadeMs`** (version 5, ADR-0032, optional): a title or closing card
  drawn over the slide; a ground slide (a `#RRGGBB` colour instead of `image` and `kenBurns`)
  carrying one; the show's fade to black. Contract and timing in [TITLE_CARDS.md](TITLE_CARDS.md).
  Version 6 makes a card's `entrance` required.
- **`video`** (version 7, ADR-0034, optional, picture slides): `{ src, startMs, endMs, volume,
duckMusic? }`, a clip played over the slide's `image`, which is its poster. `startMs` and `endMs`
  are ms of the clip; the excerpt is `MIN_VIDEO_EXCERPT_MS` (500) to `MAX_VIDEO_EXCERPT_MS`
  (300000) long, `durationMs` must equal `endMs − startMs`, `volume` is 0 to 1 and `duckMusic`
  absent means `true`. A video slide has a still framing (`kenBurns.from` equals `to`, zoom 1) and
  no `partner`. Errors name the field, e.g. `slides[i].video.endMs`. The music's duck factor is
  `duckFactorAt` over `videoSoundSpans(slides)`; see [VIDEO_SLIDES.md](VIDEO_SLIDES.md).
- **`look`** (version 9, ADR-0044, optional, top level): the slideshow's colour grade, one of
  `warm`, `cool`, `vivid`, `film`, `black-and-white`, `faded`; absent means none (`"none"` is
  refused, one spelling per state). Table and maths in [LOOKS.md](LOOKS.md).
- Only version 9 is read; older versions are refused, not upgraded — no instance holds
  slideshows older than this app.
