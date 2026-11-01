# UX backlog — Slideshow screen

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Screen: `src/app/screens/SlideshowScreen.svelte`,
its side panel and the strip.

### UX-04 Several slideshows get the same automatic title (size M)

Problem — The title is derived from the capture-date range ("July 2025"). Three slideshows of
the same month are indistinguishable in the library; the cards also share the same first
picture when made from the same folder.

Where — Start screen library with three cards "July 2025", seen in the tour.

Why — Recognition over recall: a list item must be identifiable without opening it.

Proposal — Options for the mockup: (a) ask for a title as the last step of creation, prefilled
with the date range, Enter keeps it; (b) auto-disambiguate ("July 2025 · 2") and show "N
pictures · created <date>" on the card; (c) both. The user guide says the title is editable in
place; keep that.

Done when — Two slideshows created from the same dates are told apart on the library card
without opening either; e2e covers the chosen path.
