# ADR-0025: Share a server slideshow by a token link; pictures are Immich's preview through Caddy

**Status:** accepted

## Context

A household wants to show a server slideshow (ADR-0018) to someone outside it, such as
grandparents on their TV, without an account and without sending a file. The Glissando sits
behind the owner's sign-in (ADR-0013), the Immich key never leaves Caddy, and the server does no
rendering (`dev-docs/SCOPE.md`). The web page export (ADR-0017) already has a player page that
plays a slideshow outside the app. It should look sharp on a 4K TV.

## Decision

- **A link per slideshow with its own random token in the path**, `/s/<token>`. The token is 128
  bits, separate from the slideshow id, and valid until it's turned off. Two public prefixes,
  `/s/` and `/api/share/`, get one bypass rule in the owner's sign-in proxy.
- **The token is stored in plain text**, so every device in the household can show and copy the
  link again. Only the private API answers with it.
- **Pictures are Immich's preview, served through Caddy.** Caddy's `forward_auth` asks the
  service which asset is picture `n` of the shared slideshow, then fetches its preview with the
  key and passes on only the content headers. Recipients get positions, never ids.
- **The recipient's page is the web page export's player**, fed by fetches. It composes the
  share document with the app's own `composeSlideshow`.
- `dev-docs/SHARE_LINK.md` holds the details.

## Options weighed

- **Glissando renders 3840×2160 itself on the server**: an exact bound and its own quality, and
  phones could get a smaller size. But it needs an image library in the container (libvips or
  WebAssembly decoders, plus HEIC), CPU on every first view and a disk cache. It goes against
  "the server does no rendering" and against ADR-0018's "stores no pictures".
- **Immich's original through Caddy**: no rendering anywhere, but GPS, camera and dates reach
  anyone holding the link, HEIC doesn't play in Chrome or Firefox, and an original is 5–25 MB.
  Immich's "fullsize" is no way out: for a JPEG it redirects to the original.
- **The slideshow id as the link, with an on/off flag**: no table. But the id is known to every
  device in the household and shows up in the private API and its logs. Turning the link back
  on would revive the old one, and a link that got passed around could only be killed by
  recreating the slideshow.
- **The token in a query parameter**: as visible in logs and history as the path, with no gain.
  **In the fragment** (`/s/#<token>`): never in any proxy's log, but every picture and song
  request would have to carry it in a header, for a log that the owner's proxy can filter anyway.
- **The token stored hashed**: a leaked database reveals no link. But then the link can only be
  shown once, so passing it on later means making a new one and killing the old.
- **An app route for recipients**: the full app bundle and service worker for a page that only
  plays. The export page already plays a slideshow on its own, with no second implementation to
  keep in step.

## Consequences

- At Immich's default preview resolution (short edge 1440), a shared slideshow is sharp on
  phones and laptops but soft on a 4K TV. The self-hosting guide recommends 2160, which roughly
  doubles the space the previews take. That setting is Immich-wide, and the preview's quality
  is Immich's (JPEG q 80).
- The recipient's playback differs from the household's: the household plays originals
  downscaled on the device (ADR-0018), while recipients play the preview.
- A recipient's browser may keep pictures it fetched after the link is turned off. Turning a
  link off stops new viewing, not what was already seen.
- The owner's proxy configuration grows by one bypass rule, which the guide documents for
  Authelia.
