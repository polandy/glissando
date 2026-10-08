# App

The Svelte UI in `src/app/`: screens, navigation, feedback and the player overlay. Product rules
are in [SCOPE.md](SCOPE.md) (MVP, interaction rules); the engine the overlay drives is in
[PLAYER.md](PLAYER.md). Screens are presentational: data in via props, events out via callback
props; `App.svelte` and the route components in `routes/` load data and wire the callbacks.

## Screens

- **Header** (`components/Header.svelte`): a 56 px bar. On the start screen the logo mark and
  the "Glissando" wordmark; elsewhere the back arrow and the breadcrumb (earlier crumbs hidden up
  to 720 px wide, the current one ellipsised); a right-hand slot for the screen's own buttons.
- **Start** (`screens/StartScreen.svelte`): the large logo while the library is empty, with the
  hero line and "New slideshow"; it also shows on a first launch over a filled library, so the
  start animation always plays. With slideshows: "Library / Your slideshows" and a card grid —
  a cover of the first three pictures (one large, two small), the title, "12 pictures · 1:00" and a
  music icon — ending in a dashed "New slideshow" card. A status bar at the bottom: "Offline · stored on
  this device".
- **Slideshow** (`screens/SlideshowScreen.svelte`): breadcrumb "Glissando / title"; a 16:9
  preview of the cover (tap plays) with the running time, then the pictures in play order,
  read-only, each with its order number and capture date. Beside it an info panel: title, date
  range, "Play" and the facts — pictures, duration, music, seconds per picture, Ken Burns
  "automatic", transitions "alternating".
- **Import** (`import/`, below) and the **player** open from these.

Up to 720 px wide (a container query on `.screen`) the layout narrows: one card column, the
info panel below the preview, three tiles per row.

## Import wizard

`import/ImportRoute.svelte` shows two steps under the crumbs "Glissando / New slideshow /
Pictures | Music" and a numbered two-step bar (a done step shows a mint check); the actions sit at the bottom. One `ImportSession`
(`import/import-session.ts`) holds the selection for the tab: leaving by the browser back
gesture (which cannot be stopped) keeps it, and "New slideshow" resumes it.

- **Pictures**: a drop zone with "Choose pictures" (several files, `image/*`), "choose a
  folder", and drag-and-drop on desktop (folders read recursively). While downscaling: "k of N
  pictures are being downscaled …" with a mono counter, Cancel and a mint meter; a shimmering
  placeholder per file still in flight; the tiles appear in capture order as
  they are stored. Then "n pictures · from – to" and "add more". Skipped files are a lemon
  notice, full storage a coral one with "Choose fewer pictures" (discards and reopens the
  picker). "Next" is enabled once nothing is in flight and at least one picture is stored.
  Cancel and ← with a selection ask "Discard selection?" (Keep choosing / Discard).
- **Music** (optional): a drop zone with "Choose music" (`audio/*`); a file the browser cannot
  play is a coral toast with "Retry", which reopens the picker. Chosen music is a card (music icon, file
  name, m:ss · format, a close button removes it, and a strip of the pictures' thumbnails
  splitting the track as they share it; no waveform, as only the duration is probed); without music a card with the seconds per picture
  (default 5 s). The row "n pictures | x s per picture | m:ss total" follows the composition
  rules (`src/compose/`). "Pictures" goes back; "Create slideshow" (or "Create without
  music") stores the music and then the slideshow record under the blocking overlay "Creating
  slideshow …", opens the slideshow and shows the toast "Slideshow created — tap Play".

## Wiring

`main.ts` is the composition root: it opens the IndexedDB library, picks the language from
`navigator.languages`, and builds the `Navigator` over `window.history` and the `Toaster`
over real timers.

- **Abandoned imports**: at startup and whenever an import ends (created or discarded), media
  no slideshow references is deleted — except every media id handed to the import in progress,
  so a picture stored before its slideshow record is never lost.
- **Persistent storage** is requested after the first slideshow a tab creates; a refusal shows
  the dialog "Glissando may not store anything permanently" (only "Understood"), once per
  device.
- **Unexpected errors**, including uncaught ones, are logged and shown as a coral toast;
  none is swallowed.
- **Object URLs**: thumbnails and covers exist while their screen shows them; a screen left
  before its data arrived drops the late result (`routes/route-loading.ts`). The player reads
  each display picture by media id only when it buffers it (`openPicture`), and the music when
  it opens; the music's URL is revoked when it closes. The player shows the music's file name.
- **Import flow** (`import/import-flow.ts`): the import session, the clean-up when an import
  ends and the persistence prompt after creating.

## Navigation

Routes: `start`, `slideshow(id)`, `import(pictures | music)`, `player(slideshowId)` — three
levels, the player a modal layer over its slideshow. `navigation/navigator.ts`:

- Every screen is one history entry; the back arrow calls history back, so it and the browser
  or phone back gesture do the same. `open(route)` pushes from the route's parent, or first goes
  back to that parent: the created slideshow replaces the import steps, so back leads to start.
- History state is validated on every read; anything unknown is the start screen.
- History never restores what is gone: after a reload, or on browser forward, an import step
  returns to start (its selection lived in memory) and the player to its slideshow (music needs
  a user gesture).

## Waiting and errors

- **Blocking overlay** (`BlockingOverlay`): a title and one line, always; e.g. "Creating
  slideshow …".
- **Notice** (`Notice`): inline at the cause; lemon for warnings, coral for errors.
- **Toast** (`Toast` + `toast/toaster.ts`): one at a time, bottom (right from 700 px viewport width), gone after
  6 s; an optional action and a close button. A new toast replaces the shown one. While the import wizard is
  shown, it rises above the wizard's bottom actions.
- **Dialog** (`Dialog`): a native modal dialog, only when the user must decide.

## Player overlay

`player/PlayerOverlay.svelte` takes a `Slideshow` (and an `openPicture` for stored media), fills the viewport in black, starts playing
and asks for fullscreen where the browser has the Fullscreen API (a refusal is logged at debug
level). Closing destroys the player.

- A tap toggles the controls. While playing they hide after 2.5 s; paused or ended they stay.
  Their fade is off with reduced motion.
- Top: close, the title with the current picture's capture date, "3 / 12" and a fullscreen
  button (hidden without the Fullscreen API). Bottom: the key hint (above 720 px), the seek bar
  with one tick per picture, the white play/pause button, "0:12 / 1:00" and the music's name.
- Keys: Space play/pause, ←/→ previous/next picture, Esc close, F fullscreen. "Previous" more
  than a second into a picture restarts it, else goes to the one before.
- At the end an "End" card offers "Again" and "Close"; it never jumps back by itself.
- A picture that fails to load shows a short message with "Close". Music the browser refuses
  to start leaves the player paused with the controls showing; play retries.

## Themes

Light and dark, both from the tokens in `src/styles/tokens.css` (palette in
[BRAND.md](BRAND.md)). The theme preference (`settings/theme.ts`) is "system" (the default:
follow the device's `prefers-color-scheme`), "light" or "dark". It is kept in the browser's local
storage under `glissando.theme`; an unknown stored value counts as "system". `main.ts` applies it
before anything else runs, so a pinned theme is in place for the first paint: "light" or "dark"
sets `data-theme` on `<html>`, "system" removes it. No screen sets the preference yet; the
settings sheet will.

## Languages

German and English (`i18n/`), from the browser languages, English otherwise. All copy lives in
`catalogue-de.ts` (which defines the keys, named `screen.element`) and `catalogue-en.ts` (typed
to the same keys); placeholders `{name}`, plurals `{ one, other }` on `{count}`. Components get
the translator with `getTranslator()` from Svelte context: `t(key, params)`, `formatDuration`
(m:ss), `formatSeconds` ("4,5 s"), `formatDate` (dd.mm.yyyy, UTC).
