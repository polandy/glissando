# ADR-0030: Endless playback as finite rounds of the unchanged player

**Status:** accepted

## Context

Picture frame mode (`dev-docs/app/FRAME.md`, roadmap item 9) plays one Immich album forever, in a
chosen order, varied enough not to feel like a fixed loop. The player (`src/player`) is built
around one fixed-length `Slideshow` JSON: `play`/`pause`, a known `ended`, transitions and Ken
Burns timed against a known timeline. An album can hold thousands of photos, so one `Slideshow`
covering the whole album, replayed, is both a very large JSON to build and hold at once and,
replayed unchanged, exactly the fixed loop the feature exists to avoid.

## Decision

The album is never turned into one slideshow. `src/frame/frame-deck.ts` orders the album
(shuffled with no immediate repeat across a reshuffle, or by capture date, cycling forever) and
hands out bounded rounds of `ROUND_SIZE` (40) picture ids at a time. `round-composition.ts`
composes one round's ids into an ordinary finite `Slideshow`, reusing `autoKenBurns` and
`autoTransitionEffect` from `src/compose` unchanged. `round-handover.ts` keeps exactly one
round's player active: as soon as a round starts playing, the next round is composed and started
off-screen, so by the time the current round's `ended` fires the next is usually already showing
its first picture, and the swap is invisible; only then is the finished round's player torn down.
The player itself gains no new mode or API.

## Options weighed

- **One round per player instance, handed over (chosen)** — the player, the transition shader
  and the timing model stay exactly as the rest of the app uses them; only the ordering
  (`FrameDeck`) and the hand-over (`RoundHandover`) are new, both pure and small. The cost is the
  hand-over itself: a round must be fully prepared before its turn, so there is a short window
  near an album's start where nothing is yet prepared ahead.
- **An incremental player, fed pictures as it plays** — rejected: it would add a second playback
  mode to `src/player` (append-while-playing, re-timed transitions at the seam) that only picture
  frame mode ever uses, for a module whose contract (a fixed `Slideshow` in, `play`/`pause`/
  `ended` out) every other screen depends on staying simple and predictable.
- **One finite slideshow of the whole album, looped** — rejected: it does not vary between loops
  (the opposite of "varied" in the brief), and a large album turned into one `Slideshow` up front
  is a multi-second build and a JSON the size of the album, held in memory for as long as the
  frame runs, for playback that only ever shows 40 pictures at a time.

## Consequences

- The frame always holds at most two rounds' pictures (current + preparing) in memory, not the
  album.
- `FrameDeck`, `round-composition.ts` and `round-handover.ts` are pure, framework-free and
  independently tested with fakes (no real player, clock or network in their tests); the real
  `BrowserPlayer` and Immich client are wired in only where the frame screen is built.
- A round boundary is a visible seam only if the next round's player is not yet ready when the
  current one ends; `round-handover.test.ts` covers both the immediate-swap and the
  wait-for-ready paths.
