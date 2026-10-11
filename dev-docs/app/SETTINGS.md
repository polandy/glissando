# Settings

`settings/SettingsSheet.svelte`, opened by the gear on the start screen. Like the player it is
a route with its own history entry, so ✕, a tap on the scrim, Esc and the browser or phone back
gesture all close it the same way: by going back. A native modal dialog (focus trapped, the page
behind inert, focus back on the gear when closed): above 720 px viewport width a 380 px panel at
the top right, narrower a bottom sheet. Two radio groups (`components/RadioGroup.svelte`: one tab
stop, arrows and Home/End move the choice with the focus), the Immich group, the footnote
"Applies at once and is stored on this device" and the link "Open-source licences":

- **Appearance**: "Same as device" (hint "Light or dark, following the system setting"),
  "Light", "Dark" — the theme preference ([THEMES.md](THEMES.md)).
- **Language**: "Same as browser" (hint "Currently German" or "Currently English", what the
  browser languages pick), "Deutsch", "English" — the language preference ([LANGUAGES.md](LANGUAGES.md)).
- **Immich** (`immich/ImmichSettingsGroup.svelte`): read-only, see [IMMICH.md](IMMICH.md).
- **Open-source licences** opens `third-party-licenses.md` in a new tab: the name, version and
  licence of every bundled dependency, among them mediabunny's MPL-2.0 (ADR-0015). The build
  writes it, the service worker precaches it and answers a navigation to it with the file, so it
  opens offline too.

`settings/app-settings.ts` holds both preferences: a choice is stored at once and announced to
its subscribers, a new subscriber gets the current state immediately. `main.ts` subscribes and
applies them — the theme on `<html>`, the language as `<html lang>` and the translator in effect.
