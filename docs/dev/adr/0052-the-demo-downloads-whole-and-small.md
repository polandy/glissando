# ADR-0052: The demo slideshow is downloaded whole, and kept small

**Status:** accepted

## Context

On a phone (Pixel 9 Pro, Brave) the 86 MB demo slideshow loaded for a long time and then showed
the import's "damaged" notice, although the published file was intact. Measured:

- GitHub Pages serves the file gzip-encoded (`content-length` 85 307 343 for 85 655 708 decoded
  bytes), and a range request returns a range of the gzip representation, not of the file.
- Desktop and mobile-emulated Chromium import the 86 MB file from a local server in about 5 s;
  a 32 MB rebuild (pictures at 2560 px, q80; clips as 1080p H.264/AAC, faststart) in about 1.5 s,
  and its clips play in both.
- A download cut short failed the import's ZIP directory check and was reported as a damaged
  file; the service worker also proxied the download, which lives outside its scope.

## Options

1. **Read entries by range request and start with the first slides.** Impossible on GitHub Pages,
   whose ranges address the gzip stream; and the import checks every medium before it writes
   (ADR-0038), so an early start would bypass that check.
2. **Stream the download into the import.** Same conflict with ADR-0038, and a large rewrite of
   the import for one file.
3. **Keep the whole download, make the file small, and tell a failed download from a damaged
   file.** Progress is already shown; the wait shrinks with the file.

## Decision

Option 3. The demo is rebuilt at about 32 MB (glissando-assets PR #2). The download rejects a
body shorter than an unencoded `Content-Length`, the flow hands the import only a whole ZIP, and
anything else is logged and toasted as a failed download. The service worker answers only
requests inside its scope.

## Consequences

The demo still waits for its whole file, about 32 MB, on a first tap. A failed or truncated
download now says so instead of blaming the file. A demo much larger than this would reopen the
question.
