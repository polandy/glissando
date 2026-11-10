# Immich: JPEG only and simple navigation

Concept only — nothing here is built yet. The owner asked (2026-11-10) that pictures picked from
Immich be JPEGs only, and that the picker offer simple ways to find them. The picker as it is:
`dev-docs/app/IMMICH.md`. Mockup (phone and desktop, clickable, variant switcher):
https://polandy.github.io/glissando-assets/mockups/immich-browse/

## The filter rule

A photo is a JPEG when Immich's `originalMimeType` is `image/jpeg` (also the non-standard
`image/jpg` and `image/pjpeg` some importers write). When an asset carries no MIME type, its
`originalFileName` decides: `.jpg`, `.jpeg`, `.jpe`, `.jfif`, case-insensitive. Everything else
is not listed: HEIC/HEIF, PNG, WebP, AVIF, GIF, TIFF, DNG and the other RAW formats.

- **Where it applies**: one predicate in `immich/photo-page-reader.ts`, so "All pictures", an
  album, a whole-album select and every new view below see the same set. The Immich search has
  no MIME filter (`POST /api/search/metadata` filters by `type`, not format), so the filter runs
  on each page as it arrives.
- **RAW + JPEG pairs**: Immich keeps the two files as two assets (stacked or not); the RAW drops
  out, the JPEG stays, so a pair shows once, as its JPEG. When the pair is stacked behind the
  RAW, the JPEG must still come back from the search; the first test pins that against a stacked
  pair (Immich's `withStacked` search field, to verify on Immich 3.x). A RAW without a JPEG is
  not listed.
- **HEIC (iPhone)**: not listed. Today a HEIC is taken in as Immich's JPEG preview (1440 px);
  under the rule it disappears. This hits iPhone libraries hard — owner question 2.
- **Videos**: the owner's "only JPEGs" reads as photos only. Video slides (ADR-0034) list Immich
  videos for a slideshow on the device; the concept keeps them — owner question 1.
- **Telling the user**: what is hidden is counted, so an album that looks short is not a
  mystery: a line "12 not JPEG, hidden" (mono count) per day and in an album view, like today's
  "n videos hidden". Album counts from Immich include every format, so an album card's "n photos"
  becomes exact only once its pages are read — the same rule that already holds for videos.
- **Paging**: a page of 60 assets may yield fewer JPEGs, or none. The feed keeps asking for the
  next page while a page comes back empty and Immich reports a next one, so the end-of-list
  observer never stalls on an all-HEIC stretch; "That's all · n photos" counts JPEGs.

## Navigation: what counts as simple

Simple means: **one Immich call to list, the existing search to show the result, the existing
day-grouped grid and selection unchanged**, and no feature that depends on Immich's optional
machine learning being set up. Each tool narrows the same search (`POST /api/search/metadata`,
`size` 60, `page` n, newest first) by one more field.

| Tool                  | In  | Immich call                                                        | Key permission      | Why                                                                                   |
| --------------------- | --- | ------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------- |
| All pictures (by day) | yes | exists                                                             | `asset.read`        | Unchanged, JPEG-filtered                                                              |
| Albums                | yes | exists                                                             | `album.read`        | Unchanged, JPEG-filtered                                                              |
| Jump to a month       | yes | `GET /api/timeline/buckets` (months with counts) + `takenBefore`   | `timeline.read` new | The one thing the endless feed lacks: get to 2019 fast                                |
| Favourites            | yes | `isFavorite: true` on the search                                   | none new            | A filter chip; free                                                                   |
| People                | yes | `GET /api/people` (name, face thumbnail) + `personIds: [id]`       | `person.read` new   | Immich already knows the faces (Glissando reads them for focus); one list, one filter |
| Folders               | opt | `GET /api/view/folder/unique-paths` + `GET /api/view/folder?path=` | `folder.read` new   | Useful for external libraries and camera imports; owner question 4                    |
| Smart search (CLIP)   | no  | `POST /api/search/smart`                                           | —                   | Needs Immich's ML; results unranked by date; not simple                               |
| Map, memories, tags   | no  | —                                                                  | —                   | Not asked for; each is its own screen                                                 |

- **Jump to a month**: in "All pictures" a mono button with the month in view ("Jul 2025 ▾").
  Phone: a sheet with years and their months, each with its count; desktop: the same list as a
  rail beside the grid. Picking a month restarts the feed at `takenBefore` = the end of that
  month, newest first; scrolling on loads older months as today. The bucket counts include
  non-JPEGs and videos, so they show as "≈" — or the rail drops counts (owner question 3).
  The month list is read once when the tab opens.
- **People**: a tab "People" with Immich's named people as round face crops (`GET
/api/people/{id}/thumbnail`), unnamed ones left out, a filter field by name like the albums'.
  A person opens to their JPEGs by day with "Select all n" — the album view, reused.
- **Folders** (if taken): a tab "Folders" with a path crumb, the subfolders as rows and the
  folder's JPEGs below by day, again the album view.
- The selection keeps spanning every tab, the footer is unchanged ("n selected · from k albums"
  also counts people and folders as sources: "from 3 sources").

## Permissions and docs

People, months and folders each need a further read permission on the server's key (names as in
Immich's API key dialog, to verify against the owner's Immich version before building). A key
without it answers 403 on that call only: the tab or the month button is then hidden, the rest
works, and Settings names the missing permission — never a "permission missing" for the whole
Immich box. The setup guide (`docs/self-hosting.md`, "exactly these permissions") lists the new
ones; the app's `immich.problemPermissionMissing` line and its five-permission list change with it.
`dev-docs/app/IMMICH.md` gets the filter rule and the new tools; the user guide its Immich section.

## Tests that will come first

- The JPEG predicate: each MIME type and extension above, upper case, a missing MIME type, a RAW
  and a HEIC (unit, `photo-page-reader`).
- A feed whose pages are all HEIC except the last: it reads on to the JPEGs, the end text counts
  only them (unit, `photo-feed`).
- Month jump: the search gets `takenBefore` of the month's end; a 403 on the buckets hides the
  button (unit, client + view).
- People: list, open, select all; 403 hides the tab (browser test, fake Immich fixtures).

## Open owner decisions

1. **Videos**: keep listing Immich videos for slideshows on the device (recommended — video
   slides ship today), or JPEG photos only, no videos at all?
2. **HEIC**: hide it (strict JPEG, recommended as asked), or keep it via Immich's 1440 px JPEG
   preview with a small "HEIC" tag on the tile?
3. **Month counts**: show Immich's bucket counts as "≈ 412" (recommended), or months without
   counts?
4. **Folders tab**: take it (needs `folder.read`, mainly useful with external libraries), or
   leave it out until asked (recommended)?
5. **New key permissions**: accept `timeline.read` and `person.read` (and `folder.read` with 4)
   on the server's key, which every existing install has to add by hand (recommended), or keep
   the five and drop the month jump and People?
6. **Hidden note**: count what is hidden per day and per album (recommended), once on top of the
   list, or not at all?
7. **Footer with several kinds of source**: "n selected · from 3 sources" when albums, people and
   folders mix (recommended), or keep "from k albums" and count only albums?
