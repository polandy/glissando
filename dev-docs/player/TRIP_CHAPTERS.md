# Trip chapters

Mockup: https://polandy.github.io/glissando-assets/mockups/day-chapters/. A chapter marks where
one stay of the trip ends and the next begins, with a dedicated slide of its own. Domain and
composition live under `src/compose/`; the stored fields in `src/library/stored-slideshow.ts`;
the manifest shape in `src/glissando-file/manifest-chapters.ts`.

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
  `hidden`, keyed by `pictureId`. A hidden automatic chapter still plays no chapter slide, but its
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

`composeChapters` (`src/compose/compose-chapters.ts`) inserts one extra slide before the slide
that shows each chapter's anchor picture (found by its image URL, so opening/closing cards or
pairing cannot throw off the index). The inserted slide:

- plays the stay's first picture again, held still, for `CHAPTER_SLIDE_MS` (3000) on top of the
  show's own length — the same "added duration" pattern as the title cards;
- carries an ordinary `Card`: `style: "quiet"`, `position: "bottom-left"`, `entrance: "slow-fade"`,
  a veil at the opening/closing cards' default amount, tinted with the picture's own veil colour,
  and `ink` chosen for that colour the same way a title card's is — quieter than the opening
  title, as the mockup shows it.

A hidden chapter produces no slide at all. The player itself carries no chapter logic: by the time
a chapter reaches it, it is just another `Card`/`Slide`, identical in shape to a title card's.

## Testing

`compose-chapters.test.ts` and `chapters-of-slideshow.test.ts` are table-driven unit tests over the
pure domain and composition. `compose-chapters.browser.test.ts` renders one composed chapter slide
through the real WebGL renderer and checks, pixel for pixel, that the veil darkens the picture and
that text appears in the lower third — using a generated solid-colour picture, never a real photo.
