# ADR-0055: Files from this device for a server slideshow go into a device copy

**Status:** accepted

## Context

A server slideshow links its pictures from Immich and stores none itself (ADR-0018), so it cannot
take files from this device. The owner wants those files addable all the same, made explicit
before anything happens (issue #340).

## Options

1. **Copy**: run "Keep a copy on this device", add the files to the copy, leave the server
   slideshow as it is.
2. **Move**: the same copy, then delete the server slideshow for every device.
3. **Ask each time**: the copy, with an "Also remove it from the server" checkbox, off by default.

## Decision

Option 1 (owner, #340). A sheet confirms before anything downloads; the copy is all or nothing,
and a failed copy drops the chosen files ([DEVICE_FILES.md](../server_library/DEVICE_FILES.md)).

## Consequences

Nothing is lost for the other devices at home, and the code is the existing copy flow plus the
add step. The library then holds two slideshows of that name, the copy's title made unique.
