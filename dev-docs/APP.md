# App

The Svelte UI in `src/app/`: screens, navigation, feedback and the player overlay. Product rules
are in [SCOPE.md](SCOPE.md) (MVP, interaction rules); the engine the overlay drives is in
[PLAYER.md](PLAYER.md). Screens are presentational: data in via props, events out via callback
props; `App.svelte` and the route components in `routes/` load data and wire the callbacks.

One file per section in `app/`; open only the one a change touches.

| Section                                                 | What it covers                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| [Screens](app/SCREENS.md)                               | Header, start, slideshow screen, export, opening a `.glissando` file  |
| [Editing the slideshow](app/SLIDESHOW_EDITING.md)       | Remove, select and reorder, move, add pictures, rename, transitions   |
| [Picture editor](app/PICTURE_EDITOR.md)                 | Ken Burns frames, focus, caption, duration and transition per picture |
| [Music editor](app/MUSIC_EDITOR.md)                     | Waveform, trim, fades                                                 |
| [Import wizard](app/IMPORT_WIZARD.md)                   | The pictures and music steps to a new slideshow                       |
| [Immich](app/IMMICH.md)                                 | Pictures from Immich on the self-hosted Glissando                     |
| [Wiring](app/WIRING.md)                                 | `main.ts`, the composition root, and what it builds                   |
| [Installing and offline](app/INSTALLING_AND_OFFLINE.md) | Service worker, install hint, status line                             |
| [Navigation](app/NAVIGATION.md)                         | Routes and history                                                    |
| [Waiting and errors](app/WAITING_AND_ERRORS.md)         | Blocking overlay, notices, dialogs                                    |
| [Player overlay](app/PLAYER_OVERLAY.md)                 | The player's controls over the slideshow                              |
| [Preparing](app/PREPARING.md)                           | The screen before a server slideshow plays, measuring and preparing   |
| [Settings](app/SETTINGS.md)                             | The settings sheet                                                    |
| [Themes](app/THEMES.md)                                 | Light, dark, system                                                   |
| [Languages](app/LANGUAGES.md)                           | German, English, the browser's pick                                   |
