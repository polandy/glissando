# The HTTP API

## Private (under `/api/library/`, behind the owner's sign-in)

| Request                                                            | Answer                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `POST /api/library/slideshows/{id}/share`, any JSON body (ignored) | 201 `{ "token", "createdAt" }`; 200 with the same when already shared; 404 `notFound`; 415 `notJson` |
| `DELETE /api/library/slideshows/{id}/share`                        | 204; 404 `notFound` (no such slideshow) or `notShared`                                               |

- `GET /api/library/slideshows` (each entry) and `GET /api/library/slideshows/{id}` also carry
  `"share": { "token", "createdAt" }` or `"share": null`. `createdAt` is an ISO 8601 date-time
  in UTC.
- `POST` needs `Content-Type: application/json`, like every other write, so another site can't
  turn a link on through the owner's browser (server_library/HTTP_API.md).

## Public (under `/api/share/<token>/`, no sign-in)

| Request                                          | Answer                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `GET /api/share/{token}`                         | 200 `{ "revision", "slideshow": <share document>, "beats": [ <MusicBeats> or null per song ] }`; 404 `notShared` |
| `GET /api/share/{token}/{revision}/pictures/{n}` | 200 the picture (JPEG, Immich's preview, through Caddy); 404 `notShared` or `noSuchPicture`                      |
| `GET /api/share/{token}/songs/{n}`               | 200 the song's bytes with their `Content-Type`; 404 `notShared` or `noSuchSong`                                  |

- **The share document** is the server document's `slideshow` with the following changes, made
  by a pure function (`server/share-document.ts`). It keeps only the keys it names (an allow-list
  at each level), so a key added to the format stays on the server until it is named; a test
  fails for any key of the server document that is neither shared nor deliberately removed.
  - Each picture's `immichAssetId` and any name are removed. Pictures are addressed by their
    position `n` (0-based).
  - The slideshow's `createdAt` and each picture's `capturedAt` are cut down to the first day of
    their month (UTC). The title fallback (COMPOSITION.md, Title) still works, and no exact date
    leaks.
  - Each song's `musicId` and file name are removed. Songs are addressed by their position in
    the playlist.
- **`{revision}` in a picture URL is only there for the cache**, so a reorder never serves a
  stale picture from the cache. The service always answers with picture `n` of the current
  revision. Pictures and songs answer with `Cache-Control: private, max-age=86400`, and the
  document answers with `no-store`.
- **Unknown token** and a turned-off link answer the same 404 `notShared`, so the API never
  says whether a token ever existed.
- Every other method or path under `/api/share/` and `/s/` answers 404. Caddy routes only `GET`
  and `HEAD` of the exact shapes above, the token being 22 base64url characters, and answers 404
  to a request whose raw URI under `/s/` or `/api/share/` holds `%` or `..`: unescaped and
  cleaned, such a path could match another route than the share path the owner's sign-in let
  through.
- Without slideshows on the server (no data volume, `deploy/library-off.caddy`), `/api/share/` and
  `/s/` answer 404.

## How a picture is served

Caddy owns the Immich key (ADR-0013), and the service never sees it. For
`/api/share/{token}/{revision}/pictures/{n}`, Caddy asks the service first (`forward_auth`
to `GET /internal/share-picture/{token}/{n}` on loopback; this path is never routed from
outside):

- The service answers 200 with `X-Glissando-Immich-Asset: <uuid>`, or 404 `notShared` /
  `noSuchPicture` (also for an asset id that is no UUID, so nothing else lands in Immich's path).
  Caddy passes a non-2xx answer on to the client as it is. Caddy answers every other
  `/internal/` request 404.
- On 200, Caddy fetches `GET /api/assets/<uuid>/thumbnail?size=preview` from Immich with the key.
  Before the response goes to the recipient, Caddy drops every response header except
  `Content-Type`, `Content-Length` and `ETag` (the last two only when Immich sends both), and
  sets the cache header above. A non-2xx answer from Immich reaches the recipient as its status
  only, with no body and no header.
- **Picture size**: Immich's preview has its short edge at Immich's "Preview resolution"
  setting (1440 by default). At 2160, it covers what a 3840×2160 frame shows. The self-hosting
  guide recommends 2160 for a TV. The preview carries no GPS, camera or capture date, and its
  orientation is already applied (measured with Immich v3.3.1, see the mockup's Concept tab).

## Logs

The token is a secret. The service logs `/api/share/<token>/…` and `/s/<token>` with the token
replaced by `…` (the prefix in any case), and Caddy's log filter does the same: the share routes log to their own
logger (`log_name share`, its errors too), which also drops the query and the `Referer`. The owner's own proxy logs are theirs to
configure, and the self-hosting guide says so.
