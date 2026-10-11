# SHARE_LINK.md — Share a server slideshow by link

A slideshow on the Glissando server (`dev-docs/SERVER_LIBRARY.md`) can get a link that anyone can
open in a browser to watch it, without signing in. They can't change anything, and they can't
see Immich. ADR-0025 records the choices. Mockup:
https://polandy.github.io/glissando-assets/mockups/share-link/.

| Section                                               | What it covers                                           |
| ----------------------------------------------------- | -------------------------------------------------------- |
| [The link](share_link/THE_LINK.md)                    | The token, its lifetime and what a recipient gets        |
| [The HTTP API](share_link/HTTP_API.md)                | Private and public routes, how a picture is served, logs |
| [Storage](share_link/STORAGE.md)                      | The `share_links` table and repository contract          |
| [The recipient's page](share_link/RECIPIENTS_PAGE.md) | The public player page, its language and states          |
| [In the app](share_link/IN_THE_APP.md)                | The share row, sheet and QR code                         |
| [End to end](share_link/END_TO_END.md)                | Unit, contract, browser and e2e coverage                 |
