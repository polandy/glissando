# App

The Svelte UI in `src/app/`: screens, navigation, feedback and the player overlay. Product rules
are in [SCOPE.md](SCOPE.md) (MVP, interaction rules); the engine the overlay drives is in
[PLAYER.md](PLAYER.md). Screens are presentational: data in via props, events out via callback
props; `App.svelte` and the route components in `routes/` load data and wire the callbacks.

## Screens

- **Header** (`components/Header.svelte`): a 56 px bar. On the start screen the logo mark and
  the "Glissando" wordmark; elsewhere the back arrow and the breadcrumb (earlier crumbs hidden up
  to 720 px wide, the current one ellipsised; the root crumb is "Library"); a right-hand slot for
  the screen's own buttons. While an export runs, on every screen: a progress ring and "Exporting
  “title” … 34 %" before the buttons (the label hidden up to 720 px, the ring stays) and a 3 px
  mint line along the bar's bottom edge growing with the progress.
- **Start** (`screens/StartScreen.svelte`): in the header a gear ("Settings", opens the
  settings sheet, below) and, with slideshows, "New slideshow"; the large logo while the library is empty, with the
  hero line and "New slideshow"; it also shows on a first launch over a filled library, so the
  start animation always plays; under the hero's "New slideshow" a ghost button "Open .glissando
  file". With slideshows: "Library / Your slideshows" with an "Open file" button beside it and a
  card grid —
  a cover of the first three pictures (one large, two small), the title, "12 pictures · 1:00" and a
  music icon — ending in a dashed "New slideshow" card. While the background search for the
  focus (dev-docs/LIBRARY.md, Looking for the focus) has pictures of a slideshow left, its card
  adds the line "Looking for subjects · 12 of 40" over a 2 px mint hairline filling with the
  progress (`screens/FocusSearchLine.svelte`); both go once the slideshow is done, and the card
  stays fully usable meanwhile. A status bar at the bottom
  (`pwa/StatusBar.svelte`): "Offline · stored on this device", or what
  [Installing and offline](#installing-and-offline) says. A file dragged over the library shows
  the layer "Drop to open the slideshow"; dropped, it opens (below).
- **Slideshow** (`screens/SlideshowScreen.svelte`, parts in `screens/slideshow/`): breadcrumb
  "Library / title" and a ⋯ "More" button whose menu holds "Export" (subtitle "A .glissando
  file, about 184 MB", measured when the menu opens, again only after its pictures or music changed), a separator and "Delete slideshow
  …"; a 16:9
  preview of the first picture (tap plays) with the running time, then the pictures in play
  order, each with its order number and capture date, under "Sorted by capture date" or, once
  the user reordered, "Own order" (with "drag or tap", narrow: "tap to reorder"). Beside it an
  info panel: title with a ✎ button, date range (earliest to latest capture), "Play" and the
  facts — pictures, duration (with "· music 0:44" beside it, muted, when the slideshow does not
  end with the music's excerpt), music (with music a button spanning the row: the file name,
  below it "whole track", or once changed in the music editor "0:12–2:30 · fades in and out",
  and "Edit ›"; it opens the music editor, below; without music the plain "No music"), picture times "automatic" (with own durations "automatic, 1
  own"), Ken Burns "automatic" (with own motions "automatic, 2 own"), transitions (a button
  spanning the row like the music's: the effect, e.g. "Crossfade" or "Alternating", below it
  "default" or "own choice", with own transitions "· 2 own" — a last picture's stored one does
  not count — and "Change ›"; it opens the transitions sheet, below), captions "3 of 8" (pictures with a caption of all; none: "0 of 8"). A tile carries small
  badges bottom right: a frame "own" for an own motion, a clock with "8 s" for an own duration
  and a transition mark (titled with the effect, e.g. "Circle") for an own transition, except on
  the last picture; its label adds "own motion", "own duration 8 s", "own transition Circle". The info panel and the player always use the edited picture list.
- **Editing the slideshow** (`editing/slideshow-editor.ts`; pure operations in
  `src/library/slideshow-edits.ts`): every edit applies at once and is stored; the screen is
  `aria-busy` from an edit until every edit so far is stored.
  - **Remove**: a ✕ on a tile, "Remove" in the selection bar, or Delete/Backspace on a focused
    tile — never confirmed. The ✕ and the drag grip are for a mouse only (`(hover: hover) and
(pointer: fine)`): shown on hover and on the selected tile; touch has neither and uses the
    selection bar. A toast "Picture removed" with "Undo" follows; removals made while it is
    shown add up ("3 pictures removed") and one Undo puts them all back where they were. Any move
    ends that batch and dismisses the toast, so Undo never puts pictures back at positions that
    shifted meanwhile; leaving the screen dismisses it too. While the toast shows, the removed
    pictures' media is claimed against the clean-up (`dev-docs/LIBRARY.md`). The last picture stays: its ✕ is disabled (titled with the reason);
    "Remove" looks disabled but stays focusable and clickable (`aria-disabled`), and it and
    Delete answer with the toast "The last picture stays. To get rid of it, delete the whole
    slideshow.", keeping the selection.
  - **Select and reorder**: a tap on a tile selects it (outlined in the accent; another tap
    deselects) and opens the selection bar at the bottom — "Picture 3 of 12" (a polite live
    region, so every move is announced; visually hidden up to 720 px, where the bar spans the
    width), "◀ Earlier", "Later ▶", "✎ Edit" (opens the picture editor, below), "Remove", "Done". At the ends Earlier or Later looks disabled
    but stays focusable (`aria-disabled`) and does nothing. While the
    bar shows, the content keeps room below it for the bar, and the selected tile scrolls clear
    of it. The bar's buttons highlight on hover only where the pointer hovers. Mouse: drag a
    tile onto another (tiles are draggable only with a mouse, so a touch never starts a drag); a dashed lemon line before or after the target shows where it
    lands. Keyboard: arrows move the focus (and a selection) through the grid, Shift+arrows move
    the tile (up and down by a row), Enter or Space selects, Esc deselects. With a mouse, a
    double-click on a tile opens the picture editor too.
  - **Rename**: ✎ turns the title into a field (at most 80 characters): Enter or leaving it
    saves, Esc cancels, an empty title falls back to the automatic one from the capture dates.
  - **Transitions** (`slideshow/TransitionsSheet.svelte`, ADR-0010): the info panel's
    transitions row opens a modal sheet "Slideshow transitions" (bottom sheet up to 720 px wide,
    a centred dialog above, over a scrim) with the state "Default" or, accent-tinted, "Own
    choice". A radiogroup of eight tiles in four columns — Crossfade, Push, Wipe, Circle, Zoom,
    Dissolve, Cut, Alternating — each looping its effect from the first picture to the second
    (the only picture twice when there is one; "Alternating" shows the next effect each loop;
    still with reduced motion), the picture editor's `TransitionTile`. Crossfade carries the
    tag "Default"; while it applies, the checked outline is dashed. A tap stores the choice at
    once; the arrow keys move it (selection follows focus). The hint: "Every transition:
    Dissolve. It takes 30 % of the picture's time, at most 1 s.", for a cut "The pictures follow
    one another without a transition.", for alternating "The effects alternate from picture to
    picture, never the same one twice in a row." A note names the pictures that keep an own
    transition: "Pictures 5 and 7 keep their own transitions – change them in the picture
    editor." Then "Back to crossfade" (disabled-looking and titled "The transitions are already
    set to crossfade" while they are; the toast "Transitions back to crossfade" with "Undo"
    follows) and "Done". Done, Esc or a tap on the scrim closes it; focus starts on the checked
    tile and goes back to the row.
  - **Delete**: "Delete slideshow …" asks in a dialog, "Delete “title”?", what goes (the
    slideshow and its n pictures, not the original photos; cannot be undone), "Keep" (focused)
    and a coral "Delete"; Keep or Esc puts the focus back on the ⋯ button. Deleting first closes
    the screen's undo toast, then removes the record and the media only it uses, goes back to
    start and shows the toast "Slideshow deleted" there — also when another tab deleted it
    first. An edit to a slideshow deleted elsewhere goes back to start with the toast "This
    slideshow no longer exists."
- **Picture editor** (`picture-editor/`, route `routes/PictureEditorRoute.svelte`): a picture's
  own Ken Burns motion (mockup: https://polandy.github.io/glissando-assets/mockups/editor/) and
  its caption (mockup: https://polandy.github.io/glissando-assets/mockups/captions/), its own
  duration and transition into the next picture (mockup:
  https://polandy.github.io/glissando-assets/mockups/slide-timing/, ADR-0008).
  Breadcrumb "Library / title / Picture 3"; header right ‹ previous picture, "3 / 8" (mono, hidden
  up to 720 px), › next picture (looking disabled at the ends). Back (arrow or browser) returns to
  the slideshow screen with that picture selected. Desktop: a dark well with the whole picture
  left, a 340 px panel right; up to 720 px the well spans the width on top (as high as the
  picture, at most 440 px, always the full width), the panel below.
  - **Frames**: two 16:9 frames on the picture, "Start" and "End" — exactly what the player
    crops for a 16:9 screen (`frame-geometry.ts` over the player's `cropRect`). The active one is
    solid white with four corner handles and veils the rest of the picture; its label chip sits
    top left (Start) or bottom right (End). The other one is dashed. A pointer that goes up
    before travelling 8 px is a tap, and a tap picks a frame only where that is unambiguous:
    inside the inactive frame alone, or within 24 px of exactly one frame's border (also where
    the frames overlap or nest; when both borders are that near, nothing). Otherwise a tap does
    nothing; the inactive frame's chip, or the panel's "Start | End" toggle, always picks it, the
    chip already on pointer down. A mouse shows a pointer where a click would pick the other
    frame, a move cursor elsewhere on the picture. The active frame's handles come first: a
    12 px square with a 36 px hit area, 18 px and 48 px on a touch screen, reaching past the
    picture's edges into the well's margin (20 px, 24 px on a touch screen, on a phone too, so
    the whole hit area stays on screen). A dashed line joins
    the two centres; while the preview plays, a peach outline runs over the picture with it.
  - **Focus** (`focus-indication.ts`, `FocusMarker.svelte`, `FocusLine.svelte`): with the
    automatic motion, accent corner brackets mark the subject box it aims at, with a small
    "Focus" chip above it (below a box at the picture's top, right-aligned at its right edge);
    over the frames, never in the way of a drag. Found while the editor is open, the marker
    settles in (fades in from slightly larger; at once with reduced motion); a focus already
    known, on opening or on ‹/›, shows at once. Under the picture
    one quiet line: "No subject found – the motion stays centred." or, while the search is still
    to come, a pill "Looking for the focus …" with a pulsing mint dot (still with reduced
    motion). A picture not looked at (its detection failed) shows nothing; nor does an own
    motion, whose frames say where it goes — back to automatic, the marker returns at once.
  - **Changing a frame**: a drag anywhere on the picture (one pointer, past 8 px, counted from
    where it went down) moves the active frame by the pointer's travel; a corner resizes it about
    the opposite corner (shape kept), the wheel and two fingers anywhere zoom (at once, without
    the 8 px); on the focused frame the arrow keys move it by
    1 % (Shift 5 %), + and − zoom by 0.05. Zoom runs from 1 (the whole picture as far as it fills
    a 16:9 screen) to 3, and the frame never leaves the picture. A drag is stored when it ends,
    every other change at once.
  - **Preview** (`MotionPreviewScreen.svelte`, timing in `timing/preview-timeline.ts`): at the
    top of the panel, staying in view (sticky) while the panel, or up to 720 px the page,
    scrolls. A 16:9 screen plays the picture over its real duration with its motion, rendered
    with the player's own crop and transform; its transition into the next picture in the
    picture's last part, the next picture's motion starting with it as in the player
    (ADR-0002); then 0.9 s of the next picture, or at the last picture a black "End of
    slideshow" card; then it loops. Play/pause, a progress track whose end is hatched in the
    accent where the transition runs, "0:02.4 / 0:05.0" (the picture's time), and the line
    "Picture 5 · 5.0 s, with Circle 1.0 s into picture 6" ("…, then a cut to picture 6",
    "…, then the slideshow ends"). The effects are the player's shaders redone in CSS on two
    layers (`timing/transition-styles.ts`), eased as the player eases them: crossfade, push,
    wipe, circle and zoom follow the shaders' geometry and soft edge; dissolve is approximated,
    revealing a 16 × 9 grid of cells in the shader's noise order where the player reveals
    4-pixel cells. Changing a frame pauses it on that frame of this picture alone (start or
    end); play then starts over. "Swap start and end" and "Back to automatic" replay the new
    motion from the start, and so does a new duration. Picking a transition (or its "Back to
    automatic") plays from 1.2 s before the transition. With reduced motion it starts paused; a
    swap, reset or new duration holds it at the start, a picked transition half-way through it.
  - **Panel**: below the preview "Picture 3 of 8", file name · capture date; "Ken Burns" with the
    state "Automatic" or "Own motion" (accent-tinted); the toggle, each half with "Zoom 1.20×";
    up to 720 px the hint "Drag anywhere to move the frame; corners or two fingers zoom." (wider,
    under the well: "Drag to move the frame, drag a corner to zoom · mouse wheel zooms · arrow
    keys, + and −"); "Swap start and end" and "Back to automatic".
  - **Automatic and own**: until changed, the frames show the automatic motion. The first change
    makes it the picture's own (the automatic one, changed), stored at once like every edit.
    "Swap start and end" reverses the motion (an automatic one becomes own). "Back to automatic"
    (looking disabled, titled "The motion is already automatic", while it is) drops the own
    motion without asking; the toast "Motion back to automatic" with "Undo" brings it back. An own
    motion stays with its picture through reorder, removal and undo; the automatic one follows
    the position.
  - **Caption** (`CaptionField.svelte`): below the Ken Burns section, after a hairline, the
    eyebrow "Caption" with the counter "14 / 80" (mono, characters as typed, an emoji counting as one) right of it; a
    one-line field (typing and pasting stop at 80 characters as the counter counts them, the
    caret staying put; the counter and hint describe it to a screen reader; placeholder "e.g. Evening on the jetty", Enter key labelled
    "done") with a ✕ inside on the right while it holds text, which empties it and keeps the
    focus; the hint "Shown bottom left in the player, fading in and out with the picture. Empty:
    no caption." Every keystroke is stored at once, normalised (`normalizeCaption`: whitespace
    runs become one space, trimmed, at most 80 characters; nothing left removes the caption), and
    a keystroke that changes nothing stored stores nothing. Enter leaves the field; leaving it
    tidies the text to what is stored. Nothing is filled in automatically. The preview shows
    the caption in the player's place, size and type over a 16:9 screen (`captionStyles`, type
    at least 10 px so the small screen keeps the player's proportions); it wraps with CSS like
    the DOM fallback, so its line breaks can differ from the WebGL player's.
  - **Duration** (`DurationSection.svelte`): below the caption, the eyebrow "Duration" with the
    state "Automatic" or "Own duration" (accent-tinted); a stepper − "5.0 s" + (mono, announced
    politely) in half-second steps from 2 to 15 s, − and + looking disabled (`aria-disabled`) at
    the bounds. The first step from an automatic duration off the half-second grid (shared music
    can leave it off the grid) rounds to the next grid value in the step's direction — up for +,
    down for − — and makes it the picture's own; on the grid, + and − move by half a second as
    usual. The hint follows the case: without music "The slideshow's seconds per picture. − and +
    make it this picture's own." or, own, "Automatic would be 5.0 s, the slideshow's seconds per
    picture."; with music "The music is shared evenly across the 7 pictures without an own
    duration." or, own, "The other 7 pictures share the rest of the music: 4.6 s each." or, when
    the own durations use up the music, "The music is used up; the other 7 pictures get the
    minimum, 2.0 s each." or, when every picture has its own, "Every picture has its own
    duration; the slideshow no longer follows the music's length." — each followed by "2 to
    15 s." Then "Back to automatic"
    (disabled-looking and titled "The duration is already automatic" while it is); the toast
    "Duration back to automatic" with "Undo" follows. How durations share the music:
    `dev-docs/COMPOSITION.md`.
  - **Transition** (`TransitionSection.svelte`): the eyebrow "Transition to picture 6" with the
    state "Automatic" or "Own transition"; a radiogroup of seven tiles in four columns —
    Crossfade, Push, Wipe, Circle, Zoom, Dissolve, Cut — each looping its effect from this
    picture to the next in a small 16:9 frame (Cut: a hard switch, with a slash), still half-way
    with reduced motion. The applied choice has an accent outline, dashed while automatic, and
    the automatic effect carries an "Auto" tag. Tapping any tile, also the automatic one, makes
    it the picture's own; the arrow keys move the choice (selection follows focus, one tab
    stop). The hint: "Takes 1.0 s at the end of picture 5: 30 % of the picture's time, at most
    1 s." or, for a cut, "Picture 6 follows without a transition.", while automatic prefixed by
    "Automatically, the slideshow's transition applies: Crossfade." or, for an alternating
    default, "Automatically, the transitions alternate, as set for the slideshow." The automatic
    choice is the slideshow's default (ADR-0010); an own transition stays own even when it
    equals the default. Then "Back to automatic" as
    for the duration, toast "Transition back to automatic" with "Undo". At the last picture the
    eyebrow is "Transition", the state "Last picture", and a note says "**The slideshow ends
    here**, without a transition."; with an own transition stored it adds "The own transition
    “Dissolve” stays saved and applies again once a picture follows." and an enabled "Back to
    automatic".
- **Music editor** (`music-editor/`, route `routes/MusicEditorRoute.svelte`; mockup:
  https://polandy.github.io/glissando-assets/mockups/music-trim/, ADR-0009): the music's
  excerpt and fades. Bar: back and "Library / title / Music". Desktop: a main column and a
  340 px panel on the right; up to 720 px stacked. Every change is stored at once, with no undo
  toast: "Whole track" and "Back to automatic" restore anything in one tap.
  - **Main column**: a music tile, the file name and "3:24" (trimmed: "3:24 · trimmed to 2:18").
    The waveform of the whole track (decoded once with Web Audio into 1000 peaks, drawn as a bar
    every 5 px), dimmed outside the excerpt; an accent line over it is the volume, ramping
    through the fades, and the bars inside a fade shrink with it. Two accent handles "Start"
    and "End" carry their time ("0:12,0"); dragging one, or grabbing the waveform anywhere (the
    nearer handle follows, keeping the grab's offset), moves it in tenths of a second, live,
    and stores it on release; as sliders the arrow keys move a tenth, with Shift a second. The
    excerpt stays at least 5 s; a track shorter than that stays whole. A time ruler below. Then the lane "Slideshow, 24 pictures" with
    its length: a mint bar from the excerpt's start for as long as the slideshow plays, a tick
    per picture change, lemon hatching past the excerpt's end when the pictures play on in
    silence; when the slideshow ends earlier, the waveform is hatched from there to the
    excerpt's end. "Listen to the start" (the excerpt's first 8 s with the fade-in, "from
    0:12,0") and "Listen to the end" (the last 8 s before the music stops being heard, with the
    fade-out, "until 2:30,0") toggle to pause; a playhead runs over the waveform; grabbing a
    handle stops it. A hint names the handles' keys and the line.
  - **Excerpt**: the state "Whole track" or "Trimmed" (accent-tinted), Start and End as
    "0:12,0" with − and + for half seconds, then "Whole track" (resets) or, untrimmed, "The
    slideshow uses the whole track, 3:24."
  - **Fade in** and **Fade out**: a ramp icon, the state "Automatic" or "Own", three steps Off,
    Short (2 s), Long (5 s) as a radiogroup (arrows move the choice); the automatic choice is
    outlined dashed and explained: "Automatic: short, as the excerpt starts mid-track." / "off,
    as the track plays from its start" / "short, as the slideshow ends at 2:00" / "short, as the
    excerpt stops before the track ends" / "off, as the track ends by itself". Any step makes it
    own; "Back to automatic" follows.
  - **Picture times**: "23 pictures without their own duration share the excerpt: 5.7 s each.
    The slideshow ends with the music.", or on lemon "The slideshow runs 0:14 longer than the
    music." with why, or with every picture timed "… The slideshow ends after 2:00; the music
    fades out there." The rules: `dev-docs/COMPOSITION.md`.
- **Export** (`glissando-file/export-job.ts`): runs in the background, one at a time; the app
  stays usable, also on other screens. While it runs, the menu item is `aria-disabled` and reads
  "Exporting … 34 %" (for another slideshow: "Export", subtitle "Once the running export is
  done"). At the end the browser downloads "title.glissando" and the toast "“title.glissando”
  downloaded · 184 MB" follows. A device out of storage or memory ends it with the coral toast
  "Export failed: not enough storage on the device." and "Try again"; any other failure is an
  unexpected error.
- **Open a .glissando file** (`glissando-file/open-flow.ts`): from the library ("Open file",
  the hero's button, a drop), import step 1 (below), or a double-click on the file on the desktop
  (below). It blocks under the overlay "Opening
  slideshow …" with a bar, the line "Checking file …", then "Picture 12 of 48", then "Music",
  the file name and "Cancel". Then the new slideshow's screen opens with the toast "“title”
  opened", or, when the title was taken, "Opened as “title (2)”, “title” stays unchanged."
  Cancel ends with the toast "Opening cancelled, nothing saved." A refused file is a coral
  notice with a ✕ at the top of the screen it was opened from, gone when that screen is left:
  - foreign: "“name” is not a Glissando slideshow." — "Choose another file" and, in the
    library, "New slideshow";
  - damaged or incomplete: "“name” is damaged." — "Choose another file";
  - newer: "“name” comes from a newer Glissando version." — "Reload app";
  - too large: "Not enough storage." with "needs 2.1 GB, this device has 640 MB free" (without
    the numbers where the browser cannot tell the free space) — "Choose another file". A
    storage running full while writing ends the same way, after everything written is removed.
- **Import** (`import/`, below) and the **player** open from these.

Up to 720 px wide (a container query on `.screen`) the layout narrows: one card column, the
info panel below the preview, three tiles per row.

## Import wizard

`import/ImportRoute.svelte` shows two steps under the crumbs "Library / New slideshow /
Pictures | Music" and a numbered two-step bar (a done step shows a mint check); the actions sit at the bottom. One `ImportSession`
(`import/import-session.ts`) holds the selection for the tab: leaving by the browser back
gesture (which cannot be stopped) keeps it, and "New slideshow" resumes it.

- **Pictures**: a drop zone with "Choose pictures" (several files, `image/*`), "choose a
  folder", and drag-and-drop on desktop (folders read recursively). While downscaling: "k of N
  pictures are being downscaled …" with a mono counter, Cancel and a mint meter; a shimmering
  placeholder per file still in flight; the tiles appear in capture order as
  they are stored. Then "n pictures · from – to" and "add more". Skipped files are a lemon
  notice "n files could not be read as pictures and were skipped: names. The other m pictures
  are in." (photos that could not be downloaded from Immich get their own sentence "n photos
  could not be downloaded from Immich and were skipped: names." in the same notice), full storage a coral one with "Choose fewer pictures" (discards and reopens the
  picker). A failed import is a coral notice "The import failed. No more pictures can be added."
  with "Start over" (discards the selection and shows the empty drop zone); the drop zone and
  "add more" stay hidden until then. Its error is logged; the notice is its only message (no
  "unexpected error" toast besides). "Next" is enabled once nothing is in flight and at least one picture is stored.
  Cancel and ← with a selection ask "Discard selection?" (Keep choosing / Discard). While the
  drop zone shows, a box below it offers "Slideshow from another device?" with "Open file"; a
  single .glissando file chosen or dropped on the drop zone opens it (above) instead of being
  imported as a picture. Above that box, when this Glissando offers Immich (below), a box "From
  Immich" with "Open Immich" opens the Immich browser; offline it is greyed out ("Offline — Immich
  needs a connection to your Glissando server …"), with an Immich problem it names it and offers
  "Settings". Photos added from Immich join the same import: the same progress ("n / m pictures
  being downsized …"), tiles, notices and "Next"; "add more" then also offers "more from Immich".
  A photo whose original or preview Immich does not deliver (e.g. a 404 for one deleted in Immich
  after browsing) is skipped as not downloaded and the import goes on; when only its faces fail,
  it is kept without a focus (the on-device pass looks for one) and the error is logged. An Immich
  problem met on the way (e.g. a rejected key) is reported to `ImmichAvailability`, so the Immich
  box and the settings name it.
- **Music** (optional): a drop zone with "Choose music" (`audio/*`); a file the browser cannot
  play is a coral toast with "Retry", which reopens the picker. Chosen music is a card (music icon, file
  name, m:ss · format, a close button removes it, and a strip of the pictures' thumbnails
  splitting the track as they share it; no waveform, as only the duration is probed); without music a card with the seconds per picture
  (default 5 s). The row "n pictures | x s per picture | m:ss total" follows the composition
  rules (`src/compose/`). "Pictures" goes back; "Create slideshow" (or "Create without
  music") stores the music and then the slideshow record under the blocking overlay "Creating
  slideshow …", opens the slideshow and shows the toast "Slideshow created — tap Play".

## Immich

Only the self-hosted Glissando offers Immich (ADR-0013, `docs/self-hosting.md`); the key lives in
its container, the app has no key field. `immich/immich-availability.ts` asks
`./immich/api/server/version` when the app opens, when the pictures step opens and on "Check
again", and publishes an `ImmichStatus` (`src/immich/immich-client.ts`): available, not set up
(the Immich box stays hidden), offline, Immich unreachable from the server, key rejected,
permission missing, sign-in expired (the owner's proxy redirected). If the version answer does
not match Immich's API, the error is reported and the status stays "checking". A problem a request
meets while browsing or importing is published at once (`report(kind)`); the next check may clear
it.

`immich/ImmichRoute.svelte`, under the crumbs "New slideshow / Pictures / Immich" (an album adds
its name), opened from the pictures step; ← goes back a level (album → albums → pictures step),
keeping the selection. `immich/immich-browser.ts` holds the selection, the tab, the albums and the
feeds read so far for as long as the import session lives (`App.svelte` makes one per session):

- **Tabs** "All photos" (first) and "Albums".
- **All photos**: the library's photos newest first, grouped by day (heading "Sat, 12 July 2025",
  mono count, "Select day" / "Deselect day"), square tiles from Immich's thumbnails loaded lazily.
  The next 60 load when the list nears its end (shimmering tiles meanwhile); after the last page
  "That's all · n photos". Videos are not listed.
- **Albums**: a grid of covers with name and "n photos · date range" (mono), a filter field
  (by name; "No album matches"), shimmering cards while loading. The circle on a cover selects the
  whole album (all its photos, fetched page by page), a badge counts what is selected in it. An
  album opens to its photos by day, with "Select all n" / "Select none"; "n videos hidden" when it
  has any; an empty album says so. Immich counts an album's videos with its photos, so the count
  of photos, "Select all n" and "n videos hidden" are exact once all of its pages are read (the
  first page of a small album; until then "n photos" is Immich's count and the button "Select
  all"), and the badge counts only photos already read from that album.
- **Selection** spans both tabs and several albums. A tile toggles with a tap (check circle, the
  photo inset on a peach tint). A shift-click gives every photo shown from the last tapped one to
  this one the last tapped one's state (selected or not), across days; the next shift-click
  re-aims from the same photo. The footer reads "n selected (from k albums, when k ≥ 2)" or "Tap photos or
  pick a whole album", with "Clear selection" and "Add n", which returns to the pictures step and
  adds them to the import.
- A failing request names its problem with "Try again" ("Reload" for an expired sign-in, which
  only a reload brings back); the selection stays. Immich unreachable
  (or an unexpected error) reads "Immich isn't answering"; a problem the user can act on reads
  "Immich can't be used right now" with its one line from the settings (e.g. "Immich rejects the
  server's key."). A failed whole-album select fails that album only: its card, or the album
  view under "Select all", shows the line, and the next toggle tries again. A toggle while the
  album's photos are being fetched is ignored, and a photo deselected meanwhile stays deselected.
  The album route shows "Loading the album …" while the albums load, and their failure with "Try
  again"; an album no longer in Immich reads "This album is no longer in Immich" with "Back to
  albums".

**Settings** shows a read-only "Immich" group: "Through this Glissando server · Immich 3.3.1 ·
n albums" (the server's version) when available; "Not set up" with "How to set it up" (the self-hosting guide) when not;
otherwise the problem in one line ("The Glissando backend cannot reach the Immich server.", "Immich
rejects the server's key.", "The server's key lacks permissions." naming the five, "Your sign-in
has expired.") with "Check again" (or "Reload" for the sign-in). The cause in detail is in the
container's log, never in the app.

## Wiring

`main.ts` is the composition root: it reads the settings (theme and language, below), opens the
IndexedDB library, and builds the `Navigator` over `window.history` and the `Toaster`
over real timers.

- **App shell** (ADR-0011): `index.html` paints the header bar with the brand, the logo where the
  start screen has its mark, and the status strip before any script runs. Once the app has
  mounted, `main.ts` hands over (`shell/app-shell.ts`): the shell fades out over the app in
  0.18 s and is removed, at once with reduced motion. The app's stylesheets are linked by
  `index.html`, not imported by `main.ts`, so the shell is styled from the first paint.

- **Abandoned imports**: at startup and whenever an import ends (created or discarded), media
  no slideshow references is deleted — except every media id an import in progress or a
  still-undoable removal claims, in any tab, so a picture stored before its slideshow record is
  never lost and an Undo always finds its media.
- **Persistent storage** is requested after the first slideshow a tab creates; a refusal shows
  the dialog "Glissando may not store anything permanently" ("Understood", and "Install as
  app" while installing is possible), once per device. Installing and offline follow below.
- **Unexpected errors**, including uncaught ones, are logged and shown as a coral toast;
  none is swallowed.
- **Object URLs**: thumbnails and covers exist while their screen shows them; a screen left
  before its data arrived drops the late result (`routes/route-loading.ts`). The player reads
  each display picture by media id only when it buffers it (`openPicture`), and the music when
  it opens; the music's URL is revoked when it closes. The player shows the music's file name.
- **Import flow** (`import/import-flow.ts`): the import session, the clean-up when an import
  ends and, after creating (also after opening a file), the search for the new pictures' focus
  and the persistence prompt.
- **Focus** (ADR-0012): the composition root builds the `FocusPass` over the store and the
  worker's detector and starts it as the app opens (dev-docs/LIBRARY.md, Looking for the focus).
  The start screen subscribes to it for the cards' progress; the slideshow screen subscribes to
  it while shown: the picture editor's view carries the
  picture's focus status (`subject`, `none`, `searching`, `not-looked-at`), and its motion and
  the swap aim at what is known now. The player reads the stored focus as it opens; a focus that
  cannot be read is logged and the automatic motions aim at the middle, play goes on.
- **Export and open** (`glissando-file/`): `App.svelte` owns the `ExportJob` (the header reads
  its progress through a context) and the `OpenFlow` (its overlay and notices); the composition
  root supplies the download (an object URL on a clicked link, revoked a minute later), the free
  storage estimate and the reload.

## Installing and offline

The approved mockup: https://claude.ai/artifact/LBoKKSKY9qRJ3ntHCVaAVU. The service worker and
its update rule: ADR-0005. Web app manifest and icons in `public/`; the PNG icons come from
`scripts/brand/icons.sh`.

- **Where**: only the start screen's status bar. Left a dot and a status line, right at most one
  action — never a banner or a pop-up of our own.
- **Status line** (one of, first match):
  - _insecure context_ (`http://<lan-ip>`, no service worker possible): lemon dot, "Online only ·
    no offline mode and no installing at this address" (narrow: "Online only · no offline
    mode"); action "Why?" opens a sheet: browsers allow offline use and installing only over a
    secure connection, slideshows stay stored on the device, the app itself needs the network to
    open; remedy: an `https://` address, or `localhost` on the device itself (at home e.g. Caddy
    or Tailscale).
  - _storage refused_ (the refusal was told, `persisted()` is still false, not running
    installed): lemon dot, "Offline · on this device, but not stored permanently" (narrow:
    "Offline · not stored permanently").
  - _running installed_ (display mode standalone, or iOS `navigator.standalone`): mint dot,
    "Installed · ready offline · stored on this device" (narrow: "Installed · ready offline").
  - otherwise mint dot, "Offline · stored on this device" (narrow: "Offline · on this device").
- **Action** (first match): "New version · Reload" while a new version waits (ADR-0005);
  otherwise the install hint while installing is possible, the app is not running installed and
  the hint is not dismissed — or storage was refused, then it shows again and has no ✕.
- **Install hint**: a small button with the install icon plus a ✕ ("Hide hint", remembered per
  device). Where the browser offers an install prompt (`beforeinstallprompt`: Chrome, Edge,
  Samsung Internet) it reads "Install app" and opens that prompt; accepted, the app counts as
  installed. Elsewhere it reads "Install as app" and opens a sheet with the steps of that
  browser (`pwa/install-guide.ts`, from the user agent):
  - iPhone and iPad (every iOS browser): Share → "Add to Home Screen" → "Add".
  - Safari 17 or newer on the Mac: menu "File" → "Add to Dock…" → "Add".
  - Firefox on Android: menu ⋮ → "Add to Home screen" → "Add".
  - Firefox on the computer: titled "Firefox does not install apps"; Glissando still runs
    offline here at the same address; as its own window: open it in Chrome, Edge or Safari.
  - Chromium before its prompt arrived, Safari before 17 on the Mac, and any other browser: no
    hint.
- **Persistent storage refused** also offers "Install as app" in its dialog (same action as the
  hint) while installing is possible.
- **Running installed with a told refusal**: at startup storage is requested again, since
  browsers grant it to installed apps without asking.
- **Updates**: "Reload" asks the waiting version to take over, then this tab reloads into the
  new version; other tabs keep running their version until their next start.

- **Double-click on a .glissando file** (`glissando-file/launched-files.ts`): the installed app
  registers as the program for `.glissando` (manifest `file_handlers`, type
  `application/x-glissando`, the app icon as file icon) — Chromium on the desktop only. Every
  double-clicked file opens in a new app window (`launch_handler` `navigate-new`, one window per
  file), so a running window, e.g. one playing a slideshow, stays as it is. The new window starts
  in the library and opens the file from there exactly as "Open file" does: overlay, toasts,
  notices, every format version; opening the same file again makes another copy ("Opened as …").
  Browsers without file handlers (Firefox, Safari, phones) show no trace of it; "Open file"
  stays the way there. The registration comes with installing, and updates with the manifest
  like any other file of a new version (ADR-0005).

## Navigation

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

## Waiting and errors

- **Blocking overlay** (`BlockingOverlay`): a title and one line, always; e.g. "Creating
  slideshow …". With a progress it shows a bar instead of the spinner, optionally a note (the
  file name) and "Cancel".
- **Notice** (`Notice`): inline at the cause; lemon for warnings, coral for errors. Links in its
  text, optionally buttons below it and a ✕ that dismisses it.
- **Toast** (`Toast` + `toast/toaster.ts`): one at a time, bottom (right from 700 px viewport width), gone after
  6 s; an optional action and a close button. A new toast replaces the shown one. While the import wizard's
  bottom actions or the slideshow's selection bar are shown, it rises above them.
- **Dialog** (`Dialog`): a native modal dialog, only when the user must decide.

## Player overlay

`player/PlayerOverlay.svelte` takes a `Slideshow` (and an `openPicture` for stored media), fills the viewport in black, starts playing
and asks for fullscreen where the browser has the Fullscreen API (a refusal is logged at debug
level). Closing destroys the player.

- A tap toggles the controls. While playing they hide after 2.5 s; paused or ended they stay.
  They fade in `CAPTION_GLIDE_MS` (0.3 s), the time captions glide with them; the fade is off
  with reduced motion.
- Top: close, the title with the current picture's capture date, "3 / 12" and a fullscreen
  button (hidden without the Fullscreen API). Bottom: the key hint (above 720 px), the seek bar
  with one tick per picture, the white play/pause button, "0:12 / 1:00" and the music's name.
- Captions (ADR-0007) are drawn into their slide by the player, bottom left
  (`PlayerCaption.svelte`); while the controls show, the player's `captionInset` lifts them
  above the bottom bar's controls (its height without the fade above them, `caption-inset.ts`),
  and back down when they hide, gliding there with the controls (0.3 s, CSS `ease`). They never
  sink below the screen's bottom safe area (`env(safe-area-inset-bottom)`, measured by a hidden
  probe), so a phone's home indicator stays clear; a video export has no such inset. The first
  placement after opening, and every move under reduced motion, is instant
  (`jumpCaptionInset`). A visually hidden polite live region, outside the controls, holds the
  current picture's caption for screen readers; it is empty when the player opens and filled
  right after, so the first caption is announced too.
- Keys: Space play/pause, ←/→ previous/next picture, Esc close, F fullscreen. "Previous" more
  than a second into a picture restarts it, else goes to the one before.
- At the end an "End" card offers "Again" and "Close"; it never jumps back by itself.
- A picture that fails to load shows a short message with "Close". Music the browser refuses
  to start leaves the player paused with the controls showing; play retries.

## Settings

`settings/SettingsSheet.svelte`, opened by the gear on the start screen. Like the player it is
a route with its own history entry, so ✕, a tap on the scrim, Esc and the browser or phone back
gesture all close it the same way: by going back. A native modal dialog (focus trapped, the page
behind inert, focus back on the gear when closed): above 720 px viewport width a 380 px panel at
the top right, narrower a bottom sheet. Two radio groups (`components/RadioGroup.svelte`: one tab
stop, arrows and Home/End move the choice with the focus) and the footnote "Applies at once and
is stored on this device":

- **Appearance**: "Same as device" (hint "Light or dark, following the system setting"),
  "Light", "Dark" — the theme preference below.
- **Language**: "Same as browser" (hint "Currently German" or "Currently English", what the
  browser languages pick), "Deutsch", "English" — the language preference below.
- **Immich** (`immich/ImmichSettingsGroup.svelte`): read-only, see Immich above.

`settings/app-settings.ts` holds both preferences: a choice is stored at once and announced to
its subscribers, a new subscriber gets the current state immediately. `main.ts` subscribes and
applies them — the theme on `<html>`, the language as `<html lang>` and the translator in effect.

## Themes

Light and dark, both from the tokens in `src/styles/tokens.css` (palette in
[BRAND.md](BRAND.md)). The theme preference (`settings/theme.ts`) is "system" (the default:
follow the device's `prefers-color-scheme`), "light" or "dark". It is kept in the browser's local
storage under `glissando.theme`; an unknown stored value counts as "system". An inline script in
`index.html`'s head (`build/pinned-theme-script.ts`) applies it before the first paint, so the app
shell already shows a pinned theme; `main.ts` keeps it applied from then on: "light" or "dark"
sets `data-theme` on `<html>`, "system" removes it. The settings sheet sets it.

## Languages

German and English (`i18n/`). The language preference (`settings/language.ts`) is "auto" (the
default: the first browser language the app speaks, English otherwise), "de" or "en", kept in
local storage under `glissando.language`; an unknown stored value counts as "auto". It also sets
`<html lang>` and the locale of the month in a new slideshow's title. All copy lives in
`catalogue-de.ts` (which defines the keys, named `screen.element`) and `catalogue-en.ts` (typed
to the same keys); placeholders `{name}`, plurals `{ one, other }` on `{count}`. Components get
the translator with `getTranslator()` from Svelte context; it reads the translator in effect
(`i18n/translator-state.svelte.ts`) on every call, so a language switch re-renders all copy at
once, without a reload: `t(key, params)`, `formatDuration`
(m:ss), `formatSeconds` ("4,5 s"), `formatDate` (dd.mm.yyyy, UTC).
