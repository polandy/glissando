# UX backlog — Exports and settings

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Share chooser `ExportDialog`, sheets under
`src/app/html-export`, `src/app/video-export`, `src/app/glissando-file`; Settings
`src/app/settings/SettingsSheet.svelte`.

### UX-18 Video sheet shows a codec warning on the happy path (size S)

Problem — Before "Create video" the sheet shows chips "MP4 · H.264 · Opus · 30 fps" and a
large yellow notice: "The sound will be Opus. This browser cannot encode AAC. The video plays
on computers, in VLC and on Android, but not on iPhone, iPad and Apple TV. For Apple devices,
save it in Safari, or in Chrome on Windows or macOS." Below it another paragraph explains that
every frame is rendered one by one and the screen stays on. The user has not done anything
wrong, yet the screen looks like an error.

Where — Share → Video, in Chromium on Linux (the review's browser); the notice is
`videoExport.*` in the catalogue.

Why — Warning colour for an informational limit; two paragraphs where one line serves. A
non-technical user does not know what AAC or Opus is (UX-15).

Proposal — Remove the chips. Replace the box with one muted line under the size choice:
"Won't play on iPhone, iPad or Apple TV from this browser. For those, create it in Safari."
Shown only when the limit applies. The rendering note shrinks to "Takes about as long as the
slideshow. Keep Glissando open." next to the Create button.

Done when — The sheet before Create holds: size choice, size estimate, at most two one-line
notes, Cancel, Create video; browser test asserts the notice is absent when AAC is available.

### UX-19 Size names differ between Video and Web page (size S)

Problem — Video offers Small / Standard / Large (1280×720, 1920×1080, 3840×2160), Web page
offers Small / Sharp / 4K; Settings' server quality offers Automatic / 1440 pixels / 4K.

Where — Video sheet, Web page sheet, Settings.

Why — Same decision, three vocabularies. In the Web page sheet the choice can also be empty:
with clips in the slideshow the estimate reads about the same for Small, Sharp and 4K (clips go
in whole, `htmlExport.clipsText` says so in a paragraph), yet three options are offered.

Proposal — One scale everywhere: Small (for sending) · Standard (Full HD) · Large (4K), with
the pixel size as a secondary line, and "Automatic" where it exists. Overlaps with UX-14. In
the Web page sheet show the estimate per option on the option itself; when the options are
within a few percent of each other, preselect Standard and say in one line why the size barely
changes.

Done when — The three places share one string set from the catalogue; the Web page estimate is
shown per option (browser test with a clip).

### UX-20 Settings shows the Immich block without a server (size S)

Problem — On a plain local install Settings shows "Immich · Not set up · Immich is there when
Glissando is self-hosted next to Immich. The key is set there, not here. · How to set it up".
For the local-first user this is a feature they cannot use, placed between Language and
Version.

Where — Settings sheet, any build without a server.

Why — "Offline is the primary use"; server extras are "optional extras on top, never
required", so they should not take space on the primary path.

Proposal — Hide the Immich section unless a Glissando server is configured; mention
self-hosting once in the Links group ("Self-hosting and Immich") or in the docs link only.

Done when — Settings without a server shows Appearance, Language, Version, Links; browser
test on both server states.

### UX-21 Share sheets: Esc closes the whole chooser (size S)

Problem — Inside Video / Web page / Glissando file, Esc and the scrim close the chooser
entirely, while the sheet's own Back arrow returns to the list. Switching from Video to Web
page means reopening Share.

Where — `ExportDialog` and the three sheets.

Why — Esc on a nested step is expected to go up one level, as Back does.

Proposal — Esc = Back while a nested sheet is open; a second Esc closes. Scrim click keeps
closing everything.

Done when — Browser test: Esc from the Video sheet shows the list; Esc again closes.
