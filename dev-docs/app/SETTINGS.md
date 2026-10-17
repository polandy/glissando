# Settings

`settings/SettingsSheet.svelte`, opened by the gear on the start screen. Like the player it is
a route with its own history entry, so ✕, a tap on the scrim, Esc and the browser or phone back
gesture all close it the same way: by going back. A native modal dialog (focus trapped, the page
behind inert, focus back on the gear when closed): above 720 px viewport width a 380 px panel at
the top right, narrower a bottom sheet. Radio groups, three with the server library on, else two
(`components/RadioGroup.svelte`: one tab stop, arrows and Home/End move the choice with the
focus), the Picture frame group (server library on), the Immich group, the version group, the footnote
"Applies at once and is stored on this device" and a row of three links, wrapping when narrow:
"Documentation", "Source code on GitHub" and "Open-source licences":

- **Appearance**: "Same as device" (hint "Light or dark, following the system setting"),
  "Light", "Dark" — the theme preference ([THEMES.md](THEMES.md)).
- **Language**: "Same as browser" (hint "Currently German" or "Currently English", what the
  browser languages pick), "Deutsch", "English" — the language preference ([LANGUAGES.md](LANGUAGES.md)).
- **Quality of server slideshows**, only while the server library is on: "Automatic" (hint
  "Currently 1440 · this screen has 1280 pixels on its short edge" — what it picks now and why),
  "1440 pixels" ("Starts at once, sharp on phones and laptops"), "4K" ("Sharp on large screens;
  prepares pictures before it starts"). Automatic plays 4K only when the screen's short edge in
  device pixels (screen size × `devicePixelRatio`, `screenShortEdge` in
  `settings/playback-quality.ts`) is larger than 1440. What a server slideshow then does before
  it plays: [PREPARING.md](PREPARING.md), ADR-0027.
- **Picture frame** (`settings/FrameSettingsGroup.svelte`), only while the server library is on:
  "Set up a picture frame" opens the frame's set-up screen ([FRAME.md](FRAME.md)); the switch
  "Show the card on the start page" (sub-line "Shown above your slideshows" or "Hidden in this
  browser") shows or hides the start screen's card, kept in this browser.
- **Immich** (`immich/ImmichSettingsGroup.svelte`): read-only, see [IMMICH.md](IMMICH.md).
- **Version** (`settings/VersionGroup.svelte`): "Glissando 0.0.2" and below it, in mono, the
  abbreviated commit and its date ("416d018 · 12/10/2026"). While a new version waits the box
  turns peach and offers "Reload to update", the same as the status bar's "Reload now"
  ([INSTALLING_AND_OFFLINE.md](INSTALLING_AND_OFFLINE.md)). The build puts the version from
  `package.json` and the commit into the app (`build/build-info.ts`): from
  `GLISSANDO_COMMIT` and `GLISSANDO_COMMIT_DATE` where both are set, otherwise from git; a build
  that can name neither fails. The image's build context leaves `.git` out, so
  `deploy/build-image.sh` passes both as build arguments, and `scripts/ci-image.sh` as
  environment.
- **Documentation** opens the README on GitHub, **Source code on GitHub** the repository, both
  in a new tab (`settings/project-links.ts`); they need a connection, unlike the rest of the app.
- **Open-source licences** opens `third-party-licenses.md` in a new tab: the name, version and
  licence of every bundled dependency, among them mediabunny's MPL-2.0 (ADR-0015). The build
  writes it, the service worker precaches it and answers a navigation to it with the file, so it
  opens offline too.

`settings/app-settings.ts` holds the three preferences: a choice is stored at once and announced to
its subscribers, a new subscriber gets the current state immediately. `main.ts` subscribes and
applies them — the theme on `<html>`, the language as `<html lang>` and the translator in effect.
