# Sample music

Nine tracks that come with Glissando, for a slideshow whose owner has no music of their own at
hand. Approved mockup (layout A, the accordion block above own music):
https://polandy.github.io/glissando-assets/mockups/sample-music/. Where the tracks come from and
how they are kept: ADR-0042. Code: `src/sample-music/` (catalogue, download, check),
`src/app/sample-music/` (the picker).

## The tracks

The catalogue (`src/sample-music/sample-tracks.ts`) lists them in this order, calm to epic, as
`polandy/glissando-assets` `music/README.md` does. Per track: its id (the file name without
`.mp3`), title, mood (message catalogue, German and English), length for the card, size in bytes
and the SHA-256 of the file.

| Id                               | Title                          | Mood (English)                  | Length |
| -------------------------------- | ------------------------------ | ------------------------------- | ------ |
| `hold-the-frame`                 | Hold the Frame                 | Very calm · minimal · portraits | 2:55   |
| `through-the-rain-slicked-glass` | Through the Rain-Slicked Glass | Warm · harmonious · melancholic | 2:47   |
| `before-the-world-awakens`       | Before the World Awakens       | Warm · harmonious · everyday    | 2:55   |
| `seven-floors-above`             | Seven Floors Above             | Urban · modern · floating       | 2:51   |
| `morning-latitude`               | Morning Latitude               | Cheerful · bright · upbeat      | 2:56   |
| `top-down-cruising`              | Top Down Cruising              | Sunny · upbeat · road trip      | 2:46   |
| `arrival-at-dawn`                | Arrival at Dawn                | Festive · cinematic · open      | 2:49   |
| `where-the-mountains-meet`       | Where the Mountains Meet       | Festive · cinematic · wide      | 3:00   |
| `the-view-from-the-summit`       | The View from the Summit       | Epic · anthemic                 | 2:58   |

Titles are names and stay English in both languages. The audio is never part of the app: a
track is fetched from `<base URL><id>.mp3` only when listened to or added. The covers
(`<id>.svg`, about 2 KB each, MIT) are copied into `src/sample-music/covers/` and bundled, so the
grid looks the same offline.

## The build setting

On in every build, the self-hosted Docker image included. `build/sample-music-config.ts` reads,
following the demo slideshow's pattern (`build/demo-slideshow-config.ts`):

- `GLISSANDO_SAMPLE_MUSIC`: unset, sample music is offered; `off`, it is not — no block, no
  credit, nothing fetched. Any other value fails the build, naming the variable and the two
  allowed states.
- `GLISSANDO_SAMPLE_MUSIC_URL`: the base the tracks are fetched from, an absolute http(s) URL
  ending in `/`; default `https://polandy.github.io/glissando-assets/music/`. A LAN preview or a
  mirror sets its own; anything else fails the build.

The result reaches the app as the compile-time constant `__GLISSANDO_SAMPLE_MUSIC__`
(`{ enabled, baseUrl }`), read only by the composition root (`main.ts`). The Docker image takes
both as build arguments (`deploy/Dockerfile`).

## Where it shows

- **Import, music step** (app/IMPORT_WIZARD.md): no tabs — both ways in show on the first phone
  screen (412 × 780 CSS px), one above the other: the block "Glissando music" ("9 tracks · come
  with Glissando"), the divider "or", then the compact row "Your own music" (a music icon, the
  file-format hint "MP3, M4A, FLAC, WAV, Ogg …" on one line, "Choose files"). The row is the drop
  zone; it shows a dashed accent outline only while something is dragged over it. Below them the
  one song list "Soundtrack" holds every song
  chosen, wherever it came from ("No music yet — add a track or your own songs above." while
  empty), then the picture-length panel and the buttons. An added track joins
  `ImportChoices.songs` like a picked file and is stored with them on "Create slideshow".
- **Music editor** (app/MUSIC_EDITOR.md): "Add a song" and "+ Add a song" open the sheet "Add a
  song" with the same two blocks, the music block unfolded; "Done" or Esc closes it, and the songs
  added stay. Without sample music both open the file picker directly.
- **The block** (an accordion): it shows the first three cards; "Show all 9" (`aria-expanded`,
  `aria-controls`) unfolds it in place to all nine and the credit footer, animated in height
  (none under `prefers-reduced-motion`), and reads "Show fewer", which folds it again. Nothing
  scrolls sideways. Unfolded or not, the block keeps its state while the step is open.
- **The grid**: 3 columns at every width. A card is a square, its cover filling it; the play
  button (top left) and "+" (top right, `aria-label` "Add <title>"; "✓" once added) sit on the
  cover, and the title, the mood and the length are overlaid at the bottom on a dark gradient,
  with a status line in the same overlay where one applies.

## Listening

Tapping a cover streams the track from the base URL into one shared `<audio>` element: one
preview at a time — tapping another switches to it, tapping the playing one pauses it, tapping
it again resumes. The playing card shows a pause icon on its cover, a progress bar along the
cover's bottom edge and moving bars before its title. A track on this device (below) plays from
the device instead of the network. Nothing is stored for a preview. The preview stops when the
picker closes, the block folds over the playing card, the step is left or the device goes offline (a streamed one; one from the device
plays on). A preview that fails to load returns its card to idle with the toast "Couldn't play
this song — try again".

## Adding

"+" puts the track at the end of the playlist, exactly like a picked file of one's own, and
shows "✓" (`aria-pressed`, `aria-label` "Remove <title>") while the playlist holds it; tapping "✓"
takes it out again, as × on its row does.

- **Downloaded once**: a track not on this device is fetched (`fetch`, CORS; the server's
  `Content-Length` drives the progress) and checked against the catalogue's size and SHA-256
  (`src/sample-music/sha256.ts`, own pure code, as `crypto.subtle` is missing over plain HTTP on
  the LAN). A mismatch is a failed download, never a stored track. While it downloads the song
  row is dashed and reads "Downloading · 42 %" with a progress bar; a failed one becomes the coral
  row "Couldn't download this song" until its ×, and the card's "+" is offered again.
- **Stored like an own song**: once checked, the bytes go the same way as a picked MP3 (read by
  `readPickedMusic`, its duration from the file), under the fixed media id `sample-<id>`
  (`sampleMediaId`) — so the track is stored once on the device however many slideshows play it,
  and its beats and loudness are found once. Trim, fades, volume, picture changes and every
  export (.glissando file, web page, video) work as for any song. On a server slideshow it is
  uploaded like an own song.
- **A sample song** is a `StoredMusic` with `sampleTrack: "<id>"` and `fileName` "<Title>.mp3"; it
  shows its file name as every song does, plus the badge "Sample" in the song list. The field is
  checked as an id of lowercase letters, digits and hyphens, never against the catalogue, so a
  file stays readable when the catalogue changes.

## On this device

A track is on this device when the `music` store holds `sample-<id>`. Its card reads "On this
device"; "+" then reuses that media without a download, online or offline. It stays on the
device as long as a slideshow plays it (the usual clean-up of unreferenced media, which an
import's claim on `sample-<id>` spares until its slideshow is stored).

## Offline

Without a connection (`NetworkStatus`, `src/immich/immich-availability.ts`: `navigator.onLine`
and its events), the grid opens with the notice "You are offline. Tracks already on this
device can be added; listening to the others needs a connection." A track not on this device is
dimmed, without its play button, with "+" disabled and the status "Needs a connection"; one on
this device keeps both. A download under way when the connection drops fails as above.

## The credit

The tracks are CC BY-NC 4.0 (`music/README.md`); the credit for every sample song is the one
constant `SAMPLE_MUSIC_CREDIT`, "Music: Glissando, CC BY-NC 4.0" ("Musik: Glissando, CC BY-NC
4.0").

- **Picker**: its footer reads "Music: Glissando, CC BY-NC 4.0 · free for non-commercial use".
- **.glissando file**: each sample song carries `sampleTrack` (GLISSANDO_FILE.md); an imported
  file's sample songs keep it, so the credit travels with the slideshow. Their media gets a new
  id as any imported song does.
- **Web page**: a slideshow that plays a sample song shows the credit on the start card, below
  "Erstellt mit Glissando · läuft offline" (html_export/THE_PAGE.md).
- **Share page, TV and file opener**: the same, below "Shared with Glissando" on the share
  link's start card (share_link/RECIPIENTS_PAGE.md), which the TV page shares, and below the
  made-with line of a `.glissando` file's `index.html` — whenever a song the slideshow plays
  carries `sampleTrack`.
- **Video**: no overlay and no other mark in the video.
