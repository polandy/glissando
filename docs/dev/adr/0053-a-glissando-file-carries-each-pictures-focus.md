# ADR-0053: A .glissando file carries each picture's focus

**Status:** accepted; replaces ADR-0012's "`.glissando` files do not carry it"

## Context

ADR-0012 kept the focus out of `.glissando` files: the receiving device detects it again in the
background, at the cost of a few seconds per hundred pictures. Opening the demo slideshow on a
phone showed what that costs: right after the long download, the focus search runs over every
picture on a slow phone and keeps the CPU busy, although the exporting device had already found
every result. ADR-0012's other reason was that a carried result "freezes today's detector into
every file". Since ADR-0041 every stored focus names the `detector` version that found it, and a
result from another version is looked at again.

## Options

1. **Keep detecting on the receiving device.** Simple and format-neutral, but every opened file
   pays the full search, the demo first of all.
2. **Carry each picture's stored focus with its detector version** (format version 22). The
   import stores it like the focus pass would. The pass then skips every picture whose carried
   result is current and looks again at one with an older version, as it does for a stored one.
3. **Carry the focus without a version.** Smaller, but a file from an older detector could never
   be told apart, which is the freeze ADR-0012 feared.

## Decision

Option 2. `pictures[].focus` is the `StoredFocus` record, `{ focus, detector }`, read with the
same `readStoredFocus` the server document uses, written only for a picture that has one. The
import (`writeGlissandoFile`) stores it with the picture, under the same claim, so a cancelled
import deletes it with the picture. Files of version 13 to 21 still open, their pictures without
focus, and the pass searches them as before.

## Consequences

- An opened file whose focus is current needs no detection; the demo slideshow opens without a
  focus search once it is exported again from the current app.
- A picture's focus box is visible in `glissando.json`. It says where a face or object sits in
  the picture, which the picture itself already shows, so it reveals nothing new.
- A raised `FOCUS_DETECTOR_VERSION` makes every carried result outdated, so the receiving device
  searches again, as it does for its own stored results.
- The format version rises to 22; the repacked test fixtures are rebuilt with it.
