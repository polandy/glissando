# Sessions

One session is one TV page and the remote(s) controlling it. `server/tv/tv-hub.ts` holds them
in memory, pure (clock and random bytes injected, no sockets, no timer); the
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
  counted; a session needs neither once it is made. A session holds one TV stream (a second
  closes the first) and at most `MAX_REMOTE_STREAMS` (4) remote streams: one more closes the
  oldest without `end`, so a remote that left without closing its connection frees its place.
  The remote stays present for the TV throughout.
- **Lifetime**: a session ends when `disconnect` arrives (also while the TV is away),
  `SESSION_IDLE_MS` (15 min) after the TV's stream last closed (or after the session was made,
  when the TV never opened one), and at the latest `SESSION_MAX_LIFETIME_MS` (12 h) after it was
  made, even with its TV and remote there; the TV then makes a new one. The hub checks lazily on
  each request; there is no timer.
- **Full hub**: at most `MAX_SESSIONS` (100) live, so at most as many TV streams are open. Making
  a session is public, so a claimed session with a remote stream open (a pairing in use) is never
  dropped. One more session drops, of the others, the one whose TV has been away the longest, else
  the oldest one whose TV is there: TV streams held open without a remote cannot lock the hub.
  While every session is a pairing in use, `create`/`createBound` make none (503 `tvFull`) until
  one ends.
- **What the hub does**: `create`/`createBound(token)`, `claim(code)`,
  `show(secret, slideshowId)`, `connectTv(tvKey, sink)` (replays a `snapshot` first),
  `connectRemote(secret, sink)` (replays a `snapshot` first; past the cap it closes the oldest),
  `command(secret, command)`,
  `report(tvKey, state)`, and the lookups `sourceOf(tvKey)` and `hasRemoteSecret(secret)`. A
  sink is `{ send(event), close() }`; the hub closes it when the session ends or the TV opens a
  second stream, and `connect…` returns the idempotent close the HTTP layer calls when the
  client goes. The HTTP
  layer maps sinks onto `text/event-stream`. State is replayed on connect, never only sent as an
  event, so neither side depends on which connected first. A way B session is claimed and
  showing from the start.
- **Playback state** (`PlaybackState`, as the TV last reported it): `playing`, `ended`,
  `needsTvOk`, `positionSeconds`, `durationSeconds`, `pictureIndex`, `pictureCount`, `volume`
  (0 to 1) and `title`. `readPlaybackState` (`src/tv-remote/tv-protocol.ts`) validates it
  (finite numbers, ranges); the route refuses a bad one with 400 `invalidState`.
