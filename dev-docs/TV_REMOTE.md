# TV_REMOTE.md — On the TV, controlled from the phone

A slideshow stored on the Glissando server (`dev-docs/SERVER_LIBRARY.md`) plays in a TV's
browser, and the phone is its remote: play and pause, previous and next picture, a scrubber and
the music volume. ADR-0031 records the choices. Mockup:
https://polandy.github.io/glissando-assets/mockups/tv-remote/.

| Section                                  | What it covers                                                        |
| ---------------------------------------- | --------------------------------------------------------------------- |
| [Sessions](tv_remote/SESSIONS.md)        | The session, its code, key and secret, its lifetime, the hub          |
| [The HTTP API](tv_remote/HTTP_API.md)    | Private and public routes, the two event streams, commands, state     |
| [The TV page](tv_remote/TV_PAGE.md)      | `/tv` and the share page as a TV: pairing, commands, state reports    |
| [The remote page](tv_remote/REMOTE_PAGE.md) | `/r/<secret>`: the controls, their states and words                |
| [In the app](tv_remote/IN_THE_APP.md)    | "Show on TV": the sheet, the code, the slideshow choice               |
| [End to end](tv_remote/END_TO_END.md)    | Unit, contract, browser and e2e coverage                              |
