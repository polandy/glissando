# ADR-0058: Server pictures are prepared a few at a time, with a pre-roll

**Status:** accepted (option C of issue #349, decided by recommendation; the owner confirms there)

## Context

A server slideshow's pictures were prepared one after another in play order (ADR-0027). One
slow Immich answer then delayed every following picture by the same amount, and since 1440
played right after the two measured pictures, the cache held two or three pictures when the
show began: a single slow answer made a picture late (ADR-0057 says what the player does then).
Measured with `scripts/probe-playback-stutter/probe.mjs --picture-delay-ms 3000` on 2 s slides,
the preparation fell one more second behind per slide until every picture arrived after its
slot.

## Decision

- **A few pictures are prepared at once** (`PREPARE_CONCURRENCY`): three previews, two 4K
  pictures. They are asked for in play order; a slow one delays itself only, the next ones are
  prepared past it. The player shows them in play order as before, since each slide opens its
  own picture from the cache. A picture under way is never asked for twice, also when opened out
  of order, and counts against the cache bound of 60 renditions (ADR-0027), so memory stays
  bounded. Closing cancels every picture under way. A failure other than a missing picture still
  stops preparing ahead; the pictures already under way finish, and only a picture asked for
  after the failure clears it.
- **4K prepares two at a time, not three**, because a 4K original is decoded on the device: the
  worker decodes concurrently, and a decoded 40 MP original is about 160 MB for the moment.
- **The plan counts in rounds**: `planPreload` takes the concurrency c; picture i is ready after
  (⌊i / c⌋ + 1) · t, the shortfall is maxᵢ (⌊i / c⌋ · t − sᵢ) and the pictures to prepare first
  are whole rounds, c · ⌈D / t⌉. The time per picture t is measured as before, per picture, so
  under a bandwidth limit it rises with the concurrency and the throughput c / t stays right.
- **A pre-roll of six pictures** (`PRE_ROLL_PICTURES`) is ready before playing at least, within
  the slideshow's length and the cache bound. With three at a time that is two rounds; 1440 now
  shows the preparing stage for them briefly instead of playing right after measuring.

## Options weighed

- **One at a time (before)** — the simplest; one slow answer delays the whole queue.
- **Unbounded concurrency** — all pictures in flight at once would saturate the Wi-Fi, blow the
  memory bound on a TV and let the first slides wait behind the last.
- **Three at a time for 4K too** — three originals downloading and decoding at once is
  three times 25 MB in flight and up to 500 MB of bitmaps for a moment, too much for a TV browser.
- **A pre-roll in seconds of slides** instead of a count — fits the slide length better, but a
  count is what the prepare screen shows and the cost of six previews is two rounds anyway.
- **Dividing the measured time per picture by the concurrency** instead of planning in rounds —
  undercounts the first round, which takes a whole t, and hides the model from the plan.

## Consequences

- One slow Immich answer delays one picture; the pictures behind it keep coming. With 2 s
  slides and 3 s answers, three at a time keeps up where one at a time fell behind.
- 1440 shows "Preparing pictures" for two rounds of previews before it plays, a second or two on
  a LAN, so one slow answer at the start is covered by the pictures ahead.
- The plan's wait before a 4K start shrinks by up to half, since two pictures arrive per round.
- The fake Immich and the app server see up to three requests at once per viewer.
