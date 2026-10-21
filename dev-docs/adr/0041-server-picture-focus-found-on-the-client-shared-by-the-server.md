# ADR-0041: The focus of a server picture is found on the client and shared by the server; results carry the detector version

**Status:** accepted

## Context

Device pictures get their focus from the on-device pass (ADR-0012, ADR-0036, ADR-0037). Server
pictures only got Immich's faces, asked again every session; without faces the motion aimed at
the middle. A stored focus was never looked at again, so an improved detection never reached an
existing slideshow. The owner wants the same detection for server slideshows, kept for every
device, a way to run it again, and its state visible per slideshow and per picture (concept:
https://claude.ai/artifact/PX5NFNCzzUTbb812ZGmMz5, mockup:
https://polandy.github.io/glissando-assets/mockups/focus-status/).

## Options

- **Where it runs:** in the Glissando service (pico and the ONNX runner run in Node, but the
  service would need an image decoder dependency, CPU on the owner's server and, above all, the
  Immich key, which the service never sees — ADR-0013), or in the browser's focus worker of any
  device that opens Glissando, with the result stored on the server (the pattern of beats and
  loudness).
- **What it reads:** Immich's `thumbnail` (~250 px, too small for faces in group pictures) or
  its `preview` (~1440 px, the size playback loads), scaled down to the 480 px the detection is
  tuned on.
- **Telling old results apart:** none (clear a store by hand), a time stamp, or a detector
  version stored with each result.
- **What a re-run may change:** the focus only, or also a picture's motion.

## Decision

The browser finds it: a second `FocusPass` over the server store, on every device that opens
Glissando with the server library on, over all server slideshows, newest first. Immich's faces
come first (`foundBy: "immich-faces"`); a picture without them is read at Immich's `preview`,
scaled to the 480 px thumbnail bound and run through the shared focus worker. The result goes to
the server's `picture_focus` table, keyed by the Immich asset id, outside the slideshow
document and its revision.

Every stored focus carries `detector`, the `FOCUS_DETECTOR_VERSION` that found it. A lower
version is outdated: the pass looks at it again in the background and the old result is used
until the new one is stored; the server never replaces a result by one of a lower version.
Someone can also ask to look again at one picture or one slideshow.

A re-run only ever writes the focus. A picture's own motion (start and end set by hand,
ADR-0006) is never changed by it, on any path: the pass's store port cannot write a slideshow,
the server's focus route never touches the document, and an own motion wins over any focus.

## Consequences

- The first device to open Glissando after a server slideshow is created does the work, possibly
  a phone: about 1.2–1.7 s per picture without a face, in the background.
- One request per slideshow reads every focus, instead of one Immich face request per picture.
- Two devices may look at the same picture at the same time; both store the same result (last
  write wins, as for beats).
- The device's focus store is dropped and refilled once by the schema upgrade, so every picture,
  including one stored as "none" before objects or scenery, is looked at by the current version.
- Any change to the detection raises `FOCUS_DETECTOR_VERSION` in the same change.
