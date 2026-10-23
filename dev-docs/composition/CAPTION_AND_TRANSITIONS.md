# Caption and transitions

- **Caption**: a picture's caption (`StoredPicture.caption`) becomes its slide's `caption`; a
  picture without one gets none. There is no automatic caption.
- **Transitions** (`pictureTransition`): the automatic effect is the slideshow's default
  (`StoredSlideshow.transition`, absent: the crossfade; `automaticTransition`, ADR-0010). Only
  the default `"alternate"` cycles through `TRANSITION_EFFECTS` in order by position
  (`autoTransitionEffect`, so none repeats back to back); a default `"cut"` composes no
  transition. A picture's own transition (`StoredPicture.transition`, ADR-0008) replaces it wherever
  the picture sits; `"cut"` composes a slide without `transitionToNext`. The last slide has none
  (ADR-0002), even with an own one stored. A transition's duration, own effect or automatic, is
  30% of its slide's duration, capped at 1000 ms (`transitionDurationMs`). A slide that ends on a
  beat hands over with the most whole beats, counted back along the beats found, that fit that
  duration, so the transition starts on a beat too; when one beat is longer, the usual duration
  stays (`beatTransitionDurationMs`). Under a mood ([MOOD](../app/slideshow-editing/MOOD.md),
  ADR-0045), the default transition and its duration, capped at its own maximum, are its own
  instead of 30% and 1000 ms.
