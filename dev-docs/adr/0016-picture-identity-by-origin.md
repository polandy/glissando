# ADR-0016: A picture is recognised by its origin, not by a checksum

**Status:** accepted

## Context

Pictures can be added to an existing slideshow (`dev-docs/APP.md`, Adding pictures). Adding a
picture that is already in it, from the device or from Immich, should skip it and say so; the
Immich browser should mark photos already in. That needs an identity per picture that survives
downscaling, is known before a picture is downscaled (so a duplicate costs nothing) and works on
every device the app runs on, including an iPad on the LAN over plain HTTP.

Until now a picture stored only its `fileName`, `capturedAt` and the size of its display rendition;
neither the Immich asset id nor anything about the original file was kept.

| Option                           | Recognises                                                                   | Cost and limits                                                                                                                                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Origin** (chosen)              | the same Immich asset; the same file by name, capture time and size in bytes | free: all known before decoding (a file's capture date reads only its first 128 KB). A renamed copy of a file passes as a new picture.                                                                                                                       |
| SHA-256 of the original          | the same bytes under any name                                                | `crypto.subtle` exists only in a secure context, which the app over HTTP on the LAN lacks; every original is read in full before the duplicate is known (hundreds of MB for 200 phone photos); the same photo from Immich and from the device still differs. |
| Hash of the downscaled rendition | the same pixels                                                              | depends on the browser's decoder and colour handling, so the same file need not match itself on another device; known only after the expensive decode.                                                                                                       |

## Decision

- A stored picture keeps its origin: `immichAssetId` for a photo from Immich, `fileBytes` (the
  original's size) for a file. Both are optional, so records without them need no migration.
- **Same picture** (`isSamePicture`, `src/library/picture-identity.ts`), first rule that applies:
  1. both have an Immich asset id: the ids are equal;
  2. otherwise the file name and the capture date are equal, and where both have `fileBytes`,
     those too.

  So older pictures (no origin stored) and a photo met once through Immich and once as a file
  still match by name and capture time.

- The check runs before a picture is downscaled, against the slideshow's pictures and those
  already taken in by the same import; a duplicate is skipped as _duplicate_ and can be added
  anyway on request.
- The origin travels in the `.glissando` file (format version 7), so a slideshow moved to another
  device keeps recognising its pictures.

## Consequences

- A renamed copy of a photo, or the same photo exported again by another app, is not recognised;
  the user sees it in the strip and can remove it.
- Two different photos with the same file name taken in the same second (a camera's burst after
  a counter reset) would be taken for one; the notice names it and "Add anyway" takes it in.
- No secure context and no extra read of the original are needed, so the check behaves the same
  over HTTP on the LAN as installed over HTTPS.
