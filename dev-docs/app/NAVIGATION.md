# Navigation

Routes: `start`, `settings`, `slideshow(id)`, `import(pictures | music)`, `immich(albumId | null)`
(below the pictures step; an album below the browser), `player(slideshowId)`,
`picture(slideshowId, pictureId)`, `music(slideshowId)` — four levels at most (start → import →
Immich browser → album); the player is a modal
layer over its slideshow, the settings sheet one over start, the picture and music editors
screens below their slideshow
(‹ and › replace its history entry with the neighbour's, so back still leads to the slideshow). `navigation/navigator.ts`:

- Every screen is one history entry; the back arrow calls history back, so it and the browser
  or phone back gesture do the same. `open(route)` pushes from the route's parent, or first goes
  back to that parent: the created slideshow replaces the import steps, so back leads to start.
- History state is validated on every read; anything unknown is the start screen.
- History never restores what is gone: after a reload, or on browser forward, an import step
  or the Immich browser returns to start (its selection lived in memory), the player to its slideshow (music needs
  a user gesture) and the settings sheet to start (a closed overlay stays closed).
