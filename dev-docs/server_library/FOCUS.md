# Focus on the server

A second `FocusPass` (`main.ts`), over `ServerSlideshowStore`, looks for the focus of server
slideshows' pictures the same way the device pass does ([FOCUS_SEARCH.md](../library/FOCUS_SEARCH.md))
— newest slideshow first, one picture at a time — but reads `pictureFocusForPass`, not
`pictureFocus`: a focus this session has `putPictureFocus`'d but the server has not yet confirmed
counts as unstored, so the pass puts it again rather than believing it is already there
(ADR-0041).

## One worker, never at once

Both passes share one `WorkerFocusDetector` through `serializeFocusDetector`
(`library/serialized-focus-detector.ts`): at most one detection runs at a time, and the device
pass's own call always goes ahead of a server one already waiting its turn, so a slideshow on this
device is never kept waiting by the server pass's own search.

## What it detects on

For a picture with no focus yet, `serverDetectionInput` (`server-focus-detection.ts`) asks Immich's
faces first (as an import does); with none, it downscales Immich's preview to the same bound an
import's thumbnail is and the shared detector looks at that, same as the device pass's own
thumbnails. An asset Immich answers 404 for is skipped, as any missing picture is.

## Starting, pausing, resuming

The pass starts once the server library's own availability first answers **on**
(`ServerLibraryAvailability.subscribe`, which replays its current state at once) — covering both
app open and coming back from **offline** — and again right after a slideshow is created or saved
on the server. It never starts on the frame route: a kiosk showing one album has no library to
search. An app opened on the frame starts it once it leaves the frame for its own screens, if the
server library is on (`followServerFocusStart`). `pausesOn` ends it quietly, resumable on the next start, for `ServerLibraryUnavailableError`
and `ImmichUnavailableError` — the server or Immich being unreachable, not a single picture's
detection failing.

## For the UI

`services.serverFocusPass` is the pass itself, offered the same way `services.focusPass` is:
`.state`/`.subscribe(...)` for its `FocusPassState` (ADR-0041's `running`, `paused`, `slideshows`,
`searching`, `found`, `failed`), and `.lookAgain(pictureIds)` to ask again regardless of a picture's
current record.

## Copies carry focus along

"Keep a copy on this device" (`keep-copy.ts`) stores each picture's focus from the server's own
record where it has one — it may be richer than a fresh Immich-faces lookup, e.g. confirmed or
found by scenery — falling back to Immich's faces only for a picture the server has none for.
"Save on the server" (`save-on-server.ts`) puts each linked picture's device-stored focus on the
server once the slideshow exists there, so its own pass need not find it again; a picture with
no device-stored focus is left for that pass, and a PUT that cannot reach the server is logged,
not thrown — the save has already succeeded.
