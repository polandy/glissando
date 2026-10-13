# The HTTP API

All bodies are JSON and every write needs `Content-Type: application/json` (415 `notJson`), as
in server_library/HTTP_API.md. Errors are `{ "error", "detail" }`.

## Private (under `/api/library/tv/`, behind the owner's sign-in)

| Request                                                        | Answer                                                                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/library/tv/claim` `{ "code" }` (case-insensitive)   | 200 `{ "remoteSecret" }`; 404 `noSuchCode`; 400 `invalidCode` (also a bad body)                                                        |
| `POST /api/library/tv/{remoteSecret}/show` `{ "slideshowId" }` | 204; 404 `notFound` (no such slideshow, checked first) or `noSuchTv` (session ended); 409 `boundToLink` (way B); 400 `invalidDocument` |

`show` makes the TV load `GET /api/tv/{tvKey}/show` and play it from the start. Every answer
carrying a key or secret is `Cache-Control: no-store`.

## Public (no sign-in)

| Request                                                | Answer                                                                                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/tv/sessions` (any JSON body)                | 201 `{ "tvKey", "code" }` — way A                                                                                                                           |
| `POST /api/share/{token}/tv` (any JSON body)           | 201 `{ "tvKey", "remoteSecret" }` — way B; 404 `notShared`                                                                                                  |
| `GET /api/tv/{tvKey}/events`                           | The TV's stream (below); 404 `noSuchTv`                                                                                                                     |
| `PUT /api/tv/{tvKey}/state` `PlaybackState`            | 204; 404 `noSuchTv`; 400 `invalidState`                                                                                                                     |
| `GET /api/tv/{tvKey}/show`                             | Way A: the share document of the chosen slideshow, as `GET /api/share/{token}`; 404 `notShown` until one is chosen, once it is deleted, and always in way B |
| `GET /api/tv/{tvKey}/show/{revision}/pictures/{n}`     | The picture, through Caddy as a shared one; 404 `notShown` or `noSuchPicture`                                                                               |
| `GET /api/tv/{tvKey}/show/songs/{n}`                   | The song's bytes; 404 `notShown` or `noSuchSong`                                                                                                            |
| `GET /api/tv/remote/{remoteSecret}/events`             | The remote's stream (below); 404 `noSuchTv`                                                                                                                 |
| `POST /api/tv/remote/{remoteSecret}/command` `Command` | 204; 400 `invalidCommand`; 404 `noSuchTv`; 409 `tvAway` (no TV stream is open)                                                                              |

## Streams

`Content-Type: text/event-stream`, `Cache-Control: no-store`, `X-Accel-Buffering: no`, and
a `: keep-alive` comment every `KEEP_ALIVE_MS` (25 s) from `main.ts`'s timer so a proxy keeps
the connection. Each event is `event: <name>` and `data: <JSON>`. A stream of a session that
ended answers 404 `noSuchTv` before it opens; the service ends every open stream when it stops.

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
`/internal/tv-picture/{tvKey}/{n}` as `/internal/share-picture/` does (both through the
Caddyfile snippet `immich_preview`), and answers 404 under `/api/tv/`, `/tv` and `/r/` to
anything else. `/tv` serves `share.html` and `/r/{remoteSecret}` serves `remote.html`, both
`no-cache` and `no-referrer`. Caddy's access log replaces every segment that may be a key or
secret with `…`, but keeps `/api/tv/sessions`, `/api/tv/remote` and `/api/library/tv/claim`
readable; a path holding an escape or a dot segment keeps only its first segment. The proxy's
own messages (a TV or remote leaving its stream) go through the same filter. Without the library (`library-off.caddy`) all of these answer 404.
