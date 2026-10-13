# Sessions

One session is one TV page and the remote(s) controlling it. `server/tv/tv-hub.ts` holds them
in memory as a pure class (clock, random bytes and the id source injected, no sockets); the
database never sees them, and a restart of the service ends them all.

- **`tvKey`**: 22 base64url characters (128 bit), the TV's credential for its stream, its state
  reports and, in way A, its slideshow routes. **`remoteSecret`**: the same shape, the remote's
  credential. Neither is ever returned by a route that doesn't need to; both are redacted from
  logs like a share token (share_link/HTTP_API.md, Logs), as is the code.
- **`code`** (way A only): 4 letters from `ABCDEFGHJKMNPQRSTUVWXYZ` (no I, L, O). It stands until
  the session is claimed, then it is gone and a second claim answers 404 `noSuchCode`.
  A code is unique among the live sessions.
- **Source of a slideshow**: way A has none until the signed-in phone chooses one
  (`slideshowId`); way B is bound to a share token for its whole life and never changes it.
- **Presence**: `tvPresent` is true while the TV's event stream is open. Each remote stream is
  counted; a session needs neither once it is made.
- **Lifetime**: a session ends when `disconnect` arrives, or `SESSION_IDLE_MS` (15 min) after the
  TV's stream last closed (or after the session was made, when the TV never opened one). The
  hub checks lazily on each request; there is no timer. At most `MAX_SESSIONS` (100) live; one
  more drops the session whose TV has been away the longest, else the oldest.
- **What the hub does**: `create`/`createBound(token)`, `claim(code)`, `show(secret,
  slideshowId)`, `connectTv(tvKey, sink)` (replays a `snapshot` first), `connectRemote(secret,
  sink)` (replays a `snapshot` first), `command(secret, command)`, `report(tvKey, state)`,
  `end(...)`. A sink is `{ send(event) }` with a `close` returned to the caller; the HTTP
  layer maps them onto `text/event-stream`. State is replayed on connect, never only sent as an
  event, so neither side depends on which connected first.
- **Playback state** (`PlaybackState`, as the TV last reported it): `playing`, `ended`,
  `needsTvOk`, `positionSeconds`, `durationSeconds`, `pictureIndex`, `pictureCount`, `volume`
  (0 to 1) and `title`. The hub validates it (finite numbers, ranges) and refuses a bad one with
  400 `invalidState`.
