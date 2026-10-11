# Slideshow JSON

The wire contract shared by player, app and server. `parseSlideshow` validates untrusted JSON
and throws `SlideshowFormatError` naming the path, the bad value and what to set; unknown keys
are rejected.

```json
{
  "formatVersion": 3,
  "title": "July 2025",
  "music": [
    {
      "src": "music/summer.mp3",
      "atMs": 0,
      "startMs": 12000,
      "endMs": 150000,
      "fadeInMs": 2000,
      "fadeOutMs": 3000
    },
    {
      "src": "music/autumn.mp3",
      "atMs": 135000,
      "startMs": 0,
      "endMs": 90000,
      "fadeInMs": 3000,
      "fadeOutMs": 2000
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
      "caption": "Evening on the jetty",
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
  `music[1].atMs`. Only version 3 is read.
