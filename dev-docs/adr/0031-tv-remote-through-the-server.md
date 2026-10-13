# ADR-0031: Control a slideshow on the TV from the phone through the Glissando server

**Status:** accepted

## Context

Roadmap item 10 (`dev-docs/SCOPE.md`): a slideshow plays on a TV's browser and the phone is its
remote. The two devices have no shared channel. The TV's browser is the worst case: no
camera, text entry by its own remote, an old engine, and no sign-in. The Glissando server
already stores slideshows (ADR-0018) and serves them to recipients without a sign-in
(ADR-0025), and the owner's sign-in proxy lets only the paths named for it pass without one.

## Decision

- **The server relays.** The TV holds one Server-Sent Events stream open to receive commands;
  the phone sends each command as a POST and holds its own stream to see the TV's state, which
  the TV reports by PUT. A session lives only in the service's memory, never in the database;
  a restart ends it and the TV makes a new one.
- **Two ways to start a session, one remote.** (A) The TV opens `/tv`, which makes a session and
  shows a 4-letter code and a QR code. The signed-in phone claims the code (a private route,
  so the code can only be guessed by someone who is signed in) and chooses a slideshow from the
  library; the TV plays it through session-scoped routes. (B) The TV is on a share link and the
  visitor asks for the remote; the page makes a session bound to the link, and the QR code
  carries the remote's secret, so a guest can control it.
- **The remote is a standalone page**, `/r/<secret>`, built like the share page (ADR-0025):
  public, no app bundle, the same for guests and the owner. The phone's app only claims the
  code, offers the library and then navigates there.
- **The secret is in the path, never the code.** The remote's secret and the TV's key are 128 bit
  random values like a share token; the 4-letter code only trades for the secret at the claim.
- `dev-docs/TV_REMOTE.md` holds the details.

## Options weighed

- **WebRTC between the devices, the server only for signalling**: no relay traffic. But a TV
  browser's WebRTC support and NAT traversal are the weakest part of the TV, the signalling
  needs the same server and the same sessions, and commands are a few bytes a second.
- **WebSocket instead of SSE plus POST**: one connection both ways. But Caddy and the owner's
  proxy treat a WebSocket upgrade as another special case, and the platform's `EventSource`
  reconnects by itself; commands that are one POST each are easy to test without sockets.
- **Long polling**: works anywhere, but turns every command into a latency of one poll and a
  race between two requests.
- **Pairing in the TV's own page (the phone scans a code the TV shows) without a server
  sign-in**: lets anyone who reads the TV's code choose from the owner's library. The claim
  therefore stays private; only controlling an existing session is public.
- **The remote inside the app**: one implementation less to build, but a guest would load
  the whole app and its service worker to press Play, the case ADR-0025 already rejected.

## Consequences

- The feature needs the server: a device-only Glissando shows no "Show on TV".
- Anyone who sees the TV's QR code (B) or has the remote's URL controls that one TV until it
  is disconnected or its page is closed; nothing else in the library is reachable from it.
- A TV browser blocks sound until its page has been used once. A command can then not start the
  music; the TV pauses and the remote says "Press OK on the TV once" (`needsTvOk`).
- The owner's proxy configuration grows by the public prefixes `/api/tv/`, `/tv` and `/r/`; the
  self-hosting guide documents them for Authelia. The claim and show routes stay under
  `/api/library/`.
- The service keeps at most 100 sessions; the oldest idle one is dropped for a new one. A
  session ends 15 minutes after its TV's stream last closed.
