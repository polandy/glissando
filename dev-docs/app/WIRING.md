# Wiring

`main.ts` is the composition root: it reads the settings ([THEMES.md](THEMES.md), [LANGUAGES.md](LANGUAGES.md)), opens the
IndexedDB library, and builds the `Navigator` over `window.history` and the `Toaster`
over real timers.

- **Shared UI helpers**: `src/ui-kit/` holds the framework-free pieces that both the app and the
  exported web page's script (`src/export-player/`, HTML_EXPORT.md) use: the icon table, the
  `Scheduler` port, the reduced-motion query, fullscreen, the controls' visibility and the caption
  inset above them. Neither side imports the other.
- **App shell** (ADR-0011): `index.html` paints the header bar with the brand, the logo where the
  start screen has its mark, and the status strip before any script runs. Once the app has
  mounted, `main.ts` hands over (`shell/app-shell.ts`): the shell fades out over the app in
  0.18 s and is removed, at once with reduced motion. The app's stylesheets are linked by
  `index.html`, not imported by `main.ts`, so the shell is styled from the first paint.

- **Server library** (server_library/IN_THE_APP.md): `createServerLibrary` wires the
  `./api/library` client, `ServerLibraryAvailability` (following Immich's availability), the
  `ServerSlideshowStore`, its use-cases and the per-device `ServerLibraryMemory` into
  `services.serverLibrary`. `App.svelte` hands the slideshow route the store of where the
  slideshow lives; the add flow opens its session with that home, and a server slideshow's
  session links Immich photos through `serverAddingStore`, which writes no media. The Immich
  browser hands its picks to the session (`addImmichPhotos`), which downloads or links them.
- **Abandoned imports**: at startup and whenever an import ends (created or discarded), media
  no slideshow references is deleted — except every media id an import in progress or a
  still-undoable removal claims, in any tab, so a picture stored before its slideshow record is
  never lost and an Undo always finds its media.
- **Video exports** left in the origin private file system by a crash or a closed tab are
  deleted at startup (`sweepPrivateExports`, dev-docs/VIDEO_EXPORT.md).
- **Persistent storage** is requested after the first slideshow a tab creates; a refusal shows
  the dialog "Glissando may not store anything permanently" ("Understood", and "Install as
  app" while installing is possible), once per device. Installing and offline: [INSTALLING_AND_OFFLINE.md](INSTALLING_AND_OFFLINE.md).
- **Unexpected errors**, including uncaught ones, are logged and shown as a coral toast;
  none is swallowed.
- **Object URLs**: thumbnails and covers exist while their screen shows them; a screen left
  before its data arrived drops the late result (`routes/route-loading.ts`). The player reads
  each display picture by media id only when it buffers it (`openPicture`), and every song when
  it opens; the songs' URLs are revoked when it closes. The player shows the first song's file
  name.
- **Import flow** (`import/import-flow.ts`): the import session, the clean-up when an import
  ends and, after creating (also after opening a file), the search for the new pictures' focus
  and the persistence prompt.
- **Focus** (ADR-0012): the composition root builds the `FocusPass` over the store and the
  worker's detector and starts it as the app opens (dev-docs/library/FOCUS_SEARCH.md).
  The start screen subscribes to it for the cards' progress; the slideshow screen subscribes to
  it while shown: the picture editor's view carries the
  picture's focus status (`subject`, `none`, `searching`, `not-looked-at`), and its motion and
  the swap aim at what is known now. The player reads the stored focus as it opens; a focus that
  cannot be read is logged and the automatic motions aim at the middle, play goes on.
- **Export and open** (`glissando-file/`): `App.svelte` owns the `ExportJob` (the header reads
  its progress through a context, and likewise the focus passes' `runningSearch`) and the `OpenFlow` (its overlay and notices); the composition
  root supplies the download (an object URL on a clicked link, revoked a minute later), the free
  storage estimate and the reload.
