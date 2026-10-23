# Trip chapters

Mockup: https://polandy.github.io/glissando-assets/mockups/day-chapters/. A chapter marks where
one stay of the trip ends and the next begins, playing over its anchor picture's own slide so
that picture's Ken Burns motion runs on, unbroken (Rule F). Domain and composition live under
`src/compose/`; the stored fields in `src/library/stored-slideshow.ts`; the manifest shape in
`src/glissando-file/manifest-chapters.ts`.

## Rule A — days

A picture's calendar day is the wall-clock date of its `capturedAt` (`chapter-days.ts`,
`dayNumbersOf`): the UTC-getters' date on the string as stored (with its fake "Z"). Day 1 is the
show's earliest calendar day, by capture date, not by play order. A calendar day with no picture
still counts (`showDays`), so a gap in the trip does not renumber the days after it.

## Rule B — stays

Each day's main place (`ShowDay.mainPlace`) is the most common place name among that day's
pictures, ties going to the first appearing picture. A stay (`chapter-stays.ts`, `staysOf`) is a
run of consecutive calendar days whose main place stays within `STAY_RADIUS_KM` (25) of the
stay's own place — its first placed day's main place. A day whose pictures carry no place just
continues the open stay. Once the distance is over the radius, the stay closes and a new one
opens; a day trip that strays further and comes back still starts a new stay, even to a place
already visited. A day with no place at all anywhere in the show leaves a single, placeless stay.

## Rule C — automatic chapters

Automatic chapters are on by default, and skipped altogether when:

- the show spans fewer than two calendar days (`showDays(...).length < 2`), or
- `automaticChaptersOff` is set, or
- the slideshow's order is the owner's own (`ownOrder`): chapters only make sense in chronological
  order.

Otherwise there is one automatic chapter before the first picture of every stay **except the
first** (`chapters-of-slideshow.ts`, `automaticChapterTexts`) — the trip's opening stay needs no
chapter of its own.

## Rule D — text

Chapter text is DE/EN, hand-assembled to match the mockup's exact punctuation — `Intl`'s own
`formatRange` does not reproduce it (`chapter-text.ts`):

- An automatic chapter's title is its stay's place name; its subtitle is the day range and dates,
  e.g. "Day 3–9 · 14–20 June" (same month) or "Day 3–9 · 28 June – 2 July" (crossing a month), or
  "Day 10 · Saturday, 21 June" for a one-day stay.
- An added chapter's automatic text is its anchor day's own main place and single day, or, when
  that day has no place, "Day 3" / "Tag 3" alone.

## Rule E — document model

`StoredSlideshow` (`src/library/stored-slideshow.ts`) carries three optional fields:

- `automaticChaptersOff?: true` — Rule C's switch; on is the default, so only `true` is ever
  stored.
- `chapterEdits?: readonly ChapterEdit[]` — an automatic chapter's own title/subtitle and/or
  `hidden`, keyed by `pictureId`. A hidden automatic chapter carries no card at all, but its
  picture plays as normal.
- `addedChapters?: readonly AddedChapter[]` — a manually inserted chapter, keyed by
  `beforePictureId`, with its own optional title/subtitle; an added chapter cannot be hidden, only
  removed.

A chapter's title or subtitle, when given, follows the caption rule with no "empty means
automatic" exception (`checkChapterText` in `src/library/stored-chapters.ts`) — unlike a card,
there is no notion of an empty chapter.

Editing is a set of pure functions over `StoredSlideshow`
(`src/library/slideshow-edits-chapters.ts`): `setAutomaticChaptersOff`, `setChapterTitle`,
`setChapterSubtitle`, `setChapterHidden`, `insertChapter`, `removeAddedChapter`,
`setAddedChapterTitle`, `setAddedChapterSubtitle`. Removing a picture
(`withPicturesAfterChapterRemoval`, using `chaptersWithoutPictures`) drops any edit or added
chapter anchored to it outright — a chapter has no fallback picture to move to, unlike a card's
background.

`chaptersOfSlideshow(slideshow, locale)` (`src/compose/chapters-of-slideshow.ts`) is the one
listing both the editor's chapter strip and the composer derive from: every chapter, automatic and
added, in play order, each with its automatic text, its effective (edited or automatic) text, and
whether it is hidden. `composedChapters(slideshow, locale)` narrows that to the non-hidden
chapters' anchor and text, ready for composition.

In the .glissando manifest and the share answer (`src/glissando-file/manifest-chapters.ts`), a
chapter names its picture by index (`pictureIndex`/`beforePictureIndex`) rather than by id, like a
title card's background — resolved to/from `pictureId` at the document boundary. Carried from
format version 17 (`TRIP_CHAPTERS_FROM_VERSION`, the same version that added a picture's `place`).
A server document (`src/server-library/server-document.ts`) does not carry chapters yet.

## Rule F — composition into slides

`composeChapters` (`src/compose/compose-chapters.ts`) finds the slide that already shows each
chapter's anchor picture (by its image URL, so opening/closing cards or pairing cannot throw off
the index) and merges the chapter onto that slide instead of inserting a separate one — the same
"carried by the picture's own slide" pattern a mergeable title card uses
(`TITLE_CARD_COMPOSITION.md`), so the picture's own Ken Burns motion runs on across the hand-over
instead of cutting to a second, separately-framed slide:

- the anchor's `durationMs` is lengthened by `CHAPTER_SLIDE_MS` (3000) on top of its own, the same
  "added duration" pattern as the title cards (a video clip keeps its own length, never
  lengthened);
- it carries an ordinary `Card`: `style: "quiet"`, `position: "bottom-left"`, `entrance:
"slow-fade"`, a veil at the opening/closing cards' default amount, tinted with the picture's own
  veil colour, and `ink` chosen for that colour the same way a title card's is — quieter than the
  opening title, as the mockup shows it;
- `revealAtMs` is set to `CHAPTER_SLIDE_MS - CARD_REVEAL_MS`, so the veil and text are gone by the
  time the chapter's nominal duration has elapsed, leaving the picture to play on, plain, for the
  rest of its own duration.

The anchor cannot always carry the card itself: a picture paired into a portrait slide, or a video
clip too short for the reveal to finish before its transition out, falls back to a dedicated slide
of just that picture, inserted right before the anchor — card for its whole `CHAPTER_SLIDE_MS`,
no reveal, same as a title card's own fallback.

A hidden chapter produces no slide and no card at all. The player itself carries no chapter logic:
by the time a chapter reaches it, it is just another `Card` on an ordinary `Slide`, identical in
shape to a title card's.

## Testing

`compose-chapters.test.ts` and `chapters-of-slideshow.test.ts` are table-driven unit tests over the
pure domain and composition, including the merge-onto-anchor and dedicated-slide-fallback cases.
`compose-chapters.browser.test.ts` renders a composed chapter slide through the real WebGL renderer
and checks, pixel for pixel, that the veil darkens the picture and that text appears in the lower
third; a second case renders the frame at the end of the chapter and a frame shortly after and
checks that a distinctive generated pattern sits at the same crop in both, proving the picture's
framing stays continuous across the hand-over — using generated pictures, never a real photo.
