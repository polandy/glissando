# ADR-0050: A new slideshow always starts on Calm; the import sets no pace

**Status:** accepted; supersedes ADR-0049

## Context

ADR-0049 started a new slideshow on Calm unless the import's music step set the pace: "Time per
picture" other than 5 s, or "Fill the music", kept Custom with those settings. The step thus
offered a choice that was ignored unless touched, named a 5 s the slideshow no longer played, and
held a slideshow setting that the music editor and the Mood sheet already own. Moving the seconds
out of the import leaves two questions: whether "Fill the music" stays there, and what a new
slideshow starts on.

## Decision

- **The import sets no pace.** Its music step holds neither the seconds per picture nor the
  picture-length choice ("About 5 s each" / "Fill the music"); `ImportChoices` carries neither.
- **A new slideshow always starts on Calm** (`buildStoredSlideshow`, `NEW_SLIDESHOW_MOOD`). The
  single settings are stored as `secondsPerPicture` = `DEFAULT_SECONDS_PER_PICTURE` and
  `pictureLength` = `"seconds"`, what "Back to Custom" brings back.
- **The step names the pace instead**: one muted line, "Mood Calm · about 7 s per picture, on the
  music's phrases. Change it in the slideshow.", and its timing row and music fit count with
  Calm's target seconds, as the beats are only found after creation.
- A shorter music still fits by itself, and "Repeat the music" / "Add a song" stay in the step
  (ADR-0047): they concern the music, not the pace.

## Options weighed

- _Keep "Fill the music" as a switch in the import_ — rejected: it keeps a slideshow setting in
  the import for the one case of a much longer song, which the music editor serves the same way
  one tap later.
- _Keep ADR-0049's rule for "Fill the music" alone_ — rejected with it.
- _Update ADR-0049 in place_ — rejected: the decision changed, not its wording.

## Consequences

- Every new slideshow plays Calm until the user changes the mood or a single setting in the
  slideshow; a pace for an import is set afterwards, in the music editor or the Mood sheet.
- The music editor's empty state shows the picture length too, so a slideshow without music still
  has a place to set its seconds (MUSIC_EDITOR.md).
- An e2e case that needs Custom pacing creates the slideshow, then chooses Custom in the Mood
  sheet or leaves the mood in the music editor ("Set them yourself"), and steps the seconds there.
