# Picture frame

An endless, varied slideshow from one Immich album, for an old tablet or a TV browser left
plugged in on a wall or a sideboard. Mockup:
https://polandy.github.io/glissando-assets/mockups/picture-frame/. Roadmap item 9
(`dev-docs/SCOPE.md`), design rationale ADR-0030.

## Where it is offered

A "Picture frame" card on the start screen, only while `serverState.kind === "on"`
(`dev-docs/SERVER_LIBRARY.md`): the frame reads an Immich album through the same server proxy as
the rest of the server library, so it needs the server exactly as that does. The card is absent
while the server is off or unreachable.

## Set-up screen

Fields and their defaults, all device-persisted (`src/app/frame/frame-preferences.ts`) so the
next frame opens the same way:

- **Album** — a grid of the Immich albums the server can see, each a cover thumbnail and name; no
  album chosen yet.
- **Interval** — 10 s, 30 s, 1 m or 5 m per picture; default 30 s.
- **Order** — Shuffled, Newest first or Oldest first; default Shuffled.
- **Clock** and **date** — shown over the running frame; both on by default.

A footer carries "Copy frame link" (`#frame=<albumId>`, below) and "Start frame", disabled until
an album is chosen. Waiting and errors follow `dev-docs/app/WAITING_AND_ERRORS.md`: the album
grid is a labelled shimmer while it loads; Immich unreachable is a coral notice with "Try again";
an album with no photos is a lemon notice "This album has no pictures yet." with "Back to
albums".

## Running frame

Fullscreen, no chrome by default. A tap reveals, for `CONTROLS_VISIBLE_MS` (4 s,
`src/frame/tap-controls.ts`): an exit pill (also Esc) and a bottom bar with pause/resume and
next; a further tap hides them again at once. The clock (if on) sits top-right, the date and
album name (if the date is on) bottom-left — the mockup's copy says "date and place", but place
comes from Immich's reverse geocoding, which this screen does not read, so only the date and the
album's own name are shown; a future iteration may add place once Immich exposes it to the
client. The screen is kept awake for as long as the frame runs
(`keepScreenAwake`, `src/app/video-export/screen-awake.ts` — despite its path, generic). Ken
Burns and transitions are the player's usual automatic choices (`src/compose`); there is no
music.

## Deep link

`#frame=<albumId>` opens the frame directly on that album, skipping the set-up screen —
`src/app/frame/frame-deep-link.ts` parses and builds it. It is the app's first URL-driven entry
point; every other route lives only in `history.state` (`dev-docs/app/NAVIGATION.md`), because a
picture frame is often opened once and left running, or sent to a TV browser by a link rather
than operated there.

## Endless playback

The player (`src/player`) plays one fixed `Slideshow` to its end; a picture frame has no end.
`src/frame/frame-deck.ts`, `round-composition.ts` and `round-handover.ts` turn the album into a
run of bounded rounds the existing player can each play once, handed over seamlessly from one to
the next — the design and the rejected alternatives are ADR-0030. In short:

- `FrameDeck.nextRound()` returns up to `ROUND_SIZE` picture ids in the chosen order, shuffled
  (no repeat of the album until every picture has shown, and never the same picture twice in a
  row across a reshuffle) or capture-date order (oldest/newest first), cycling forever.
  `composeRound` turns one round's ids into a finite `Slideshow`.
- `RoundHandover` keeps exactly one round playing: as soon as a round starts, the next is
  created and started hidden, so it is usually already showing its first picture by the time the
  current one ends; only then is the old round torn down. An album with nothing to compose a
  round from (e.g. every photo removed in Immich) ends the frame with `endOfPictures`.
