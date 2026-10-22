# ADR-0043: Place names come from a bundled GeoNames "cities15000" list

**Status:** accepted

## Context

Trip chapters need a place name for a picture's GPS coordinates (e.g. "Lisbon") without a server
and without a connection (`dev-docs/SCOPE.md`): the lookup must run fully offline, from data
shipped with the app.

| Option                                        | Size (compressed)   | Coverage                                                                  |
| ---------------------------------------------- | -------------------- | -------------------------------------------------------------------------- |
| **GeoNames `cities15000`** (chosen)            | ~400 KB, ~30k places | every place with population ≥ 15,000; a village resolves to its nearest larger town |
| GeoNames `cities5000`                          | ~1 MB, ~70k places   | population ≥ 5,000: more rural precision, over double the size            |
| Natural Earth populated places                 | public domain, ~7k   | far coarser; whole regions have no entry close enough                     |
| An online geocoder                             | nothing bundled      | rejected outright: needs a connection and sends the owner's GPS trail to a third party, against local-first and privacy |

`cities15000` is the smallest list that gives most pictures a town within a useful distance; a
picture taken in a small village names the nearest larger town instead of its own hamlet, an
accepted cost for a quarter of `cities5000`'s size.

GeoNames' dump is CC BY 4.0, which requires attribution; GeoNames offers no public API key-free
way to confirm a dump's exact bytes beyond downloading and checking it, and the dump is
regenerated daily, so a bundled copy must freeze one day's bytes deliberately.

## Decision

- **Data**: `cities15000` from `https://download.geonames.org/export/dump/cities15000.zip`,
  reduced to the three columns trip chapters need — `name`, `latitude`, `longitude` (rounded to 3
  decimals, about 110 m, far tighter than the 50 km lookup radius needs) — and committed as a
  generated static asset (`scripts/places/build.sh`), never hand-edited, like the brand assets.
- **Name**: GeoNames' own `name` column as published, mostly the common English form ("Lisbon").
  No alternate names or translations are kept, to keep the file small.
- **Licence**: credited in the app's third-party licences list
  (`src/app/settings/third-party-licenses.ts`) as "Place names © GeoNames (CC BY 4.0)", linking
  `https://www.geonames.org/`.
- **When the lookup runs**: at import, once per picture that has GPS — never in the player, which
  only ever sees the place already resolved and stored on the picture. The place data asset is
  fetched lazily, only when an imported picture actually has GPS, not on every app start.
- **Trust in the dump**: the build script records the SHA-256 of the exact dump it last built
  from; a changed dump (GeoNames regenerates it daily) fails the build with a message to review
  the new dump and update the recorded hash deliberately, rather than silently shipping whatever
  GeoNames serves that day.

## Consequences

- A picture from a hamlet or a stretch of coast with no city within 50 km gets no place (e.g. at
  sea or in sparsely populated country), same as one with no GPS at all.
- Refreshing the bundled list (a newer GeoNames dump, or a size/coverage change) is a deliberate,
  reviewed re-run of `scripts/places/build.sh` with its recorded hash updated, committed like any
  other generated asset.
- The three-column, no-alternate-names cut keeps the asset small enough to precache without
  weighing down every install, at the cost of no disambiguation between same-named places (the
  nearest one by distance wins regardless of name clashes elsewhere in the world).
