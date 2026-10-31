# Navigation

Routes: `start`, `settings`, `slideshow(id)`, `import(pictures | music)`, `immich(albumId | null)`
(below the pictures step; an album below the browser), `player(slideshowId)`,
`picture(slideshowId, pictureId)`, `music(slideshowId)`, `frameSetup`, `frame(albumId)` — four
levels at most (start → import →
Immich browser → album); the player and the running picture frame are modal
layers over their slideshow or start, the settings sheet and the frame set-up screen ones over
start, the picture and music editors
screens below their slideshow
(‹ and › replace its history entry with the neighbour's, so back still leads to the slideshow). `navigation/navigator.ts`:

- Every screen is one history entry; the back arrow calls history back, so it and the browser
  or phone back gesture do the same. `open(route)` pushes from the route's parent, or first goes
  back to that parent: the created slideshow replaces the import steps, so back leads to start.
- A screen whose in-memory selection would be lost (import, add pictures) registers a leave guard
  with `guardLeave`. A history move away from it that `open()` did not start asks the guard with
  the destination; on `false` the navigator pushes the entry back and the screen shows its
  discard dialog. Moves between the selecting screens pass, and an `open()` climbing down skips
  the guard.
- History state is validated on every read; anything unknown is the start screen.
- History never restores what is gone: after a reload, or on browser forward, an import step
  or the Immich browser returns to start (its selection lived in memory), the player to its slideshow (music needs
  a user gesture) and the settings sheet to start (a closed overlay stays closed).
- **`#frame=<albumId>`** (`dev-docs/app/FRAME.md`) is the one route with a real URL, not just
  history state: opening the app on that hash goes straight to `frame(albumId)`, skipping start
  and set-up, for a link sent to a tablet or TV browser. Every other route still lives only in
  `history.state`. The hash is cleared once resolved (whether or not it ended up opening the
  frame): left in the address bar it is outside `history.state` and outside every "history never
  restores what is gone" rule above, so a later reload would replay the same deep link even after
  the user explicitly exited the frame.
