# The HTTP API

All bodies are JSON and every write needs `Content-Type: application/json` (415 `notJson`), as
in server_library/HTTP_API.md. Errors are `{ "error", "detail" }`.

## Private (under `/api/library/tv/`, behind the owner's sign-in)

| Request                                                                    | Answer                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `POST /api/library/tv/claim` `{ "code" }` (case-insensitive)               | 200 `{ "remoteSecret" }`; 404 `noSuchCode`; 400 `invalidCode`       |
| `POST /api/library/tv/{remoteSecret}/show` `{ "slideshowId" }`             | 204; 404 `noSuchTv` (session ended) or `notFound` (no such slideshow); 409 `boundToLink` (way B) |

`show` makes the TV load `GET /api/tv/{tvKey}/show` and play it from the start.

## Public (no sign-in)

| Request                                                    | Answer                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `POST /api/tv/sessions` (any JSON body)                    | 201 `{ "tvKey", "code" }` — way A                                                |
| `POST /api/share/{token}/tv` (any JSON body)               | 201 `{ "tvKey", "remoteSecret" }` — way B; 404 `notShared`                       |
| `GET /api/tv/{tvKey}/events`                               | The TV's stream (below); 404 `noSuchTv`                                          |
| `PUT /api/tv/{tvKey}/state` `PlaybackState`                | 204; 404 `noSuchTv`; 400 `invalidState`                                          |
| `GET /api/tv/{tvKey}/show`                                 | Way A: the share document of the chosen slideshow, as `GET /api/share/{token}`; 404 `notShown` until one is chosen |
| `GET /api/tv/{tvKey}/show/{revision}/pictures/{n}`         | The picture, through Caddy as a shared one; 404 `notShown` or `noSuchPicture`   |
| `GET /api/tv/{tvKey}/show/songs/{n}`                       | The song's bytes; 404 `notShown` or `noSuchSong`                                 |
| `GET /api/tv/remote/{remoteSecret}/events`                 | The remote's stream (below); 404 `noSuchTv`                                      |
| `POST /api/tv/remote/{remoteSecret}/command` `Command`     | 204; 400 `invalidCommand`; 404 `noSuchTv`; 409 `tvAway` (no TV stream is open)   |

## Streams

`Content-Type: text/event-stream`, `Cache-Control: no-store`, `X-Accel-Buffering: no`, and
a `: keep-alive` comment every `KEEP_ALIVE_MS` (25 s) from `main.ts`'s timer so a proxy keeps
the connection. Each event is `event: <name>` and `data: <JSON>`.

- **TV stream**: first `snapshot` `{ "claimed": boolean, "showing": boolean, "remotePresent": boolean }`, then
  `claimed` `{}` (way A: the phone claimed the code), `show` `{}`, `command` `<Command>`,
  `remote` `{ "present": boolean }` (the first remote stream opened or the last closed) and
  `end` `{}` (the session ended; the TV makes a new one). The TV opening a second stream closes the first.
- **Remote stream**: first `snapshot` `{ "tvPresent", "state": PlaybackState | null }`, then
  `state` `<PlaybackState>`, `tv` `{ "present": boolean }` and `end` `{}`.

## Command

`{ "type": "play" | "pause" | "next" | "previous" | "restart" | "disconnect" }` or
`{ "type": "seek" | "volume", "value": number }` (seconds from the start, 0 to 1). `disconnect`
ends the session: both streams get `end`.

## Logs and Caddy

The stream, `command`, `state`, `show`, claim and session paths log without their key, secret
or code (`redactTvSecrets`), as share paths do. Caddy routes exactly these shapes (keys and
secrets are 22 base64url characters), flushes the two stream routes unbuffered
(`flush_interval -1`), sends the picture route through `forward_auth` to
`/internal/tv-picture/{tvKey}/{n}` as `/internal/share-picture/` does, and answers 404 under
`/api/tv/`, `/tv` and `/r/` to anything else. Without the library (`library-off.caddy`) all of
these answer 404.
