# Import wizard — Music step

Optional, the wizard's second step. Intro: "One song or several — they play one after another
and the pictures change on their beat. Without music each picture stays 5 s."

Without tabs and both on the first phone screen: the block "Glissando music"
(`library/SAMPLE_MUSIC.md`, where the build offers it), the divider "or", and the row "Your own
music" (`library/SAMPLE_MUSIC.md`, "Where it shows" — the drop zone), with "Choose files"
(`audio/*` plus every recognised extension, `MUSIC_FILE_PICKER_ACCEPT` — iPadOS greys out files it
cannot type by location otherwise; several at once; hint "One or more files · MP3, M4A, FLAC, WAV,
Ogg, AIFF, WMA …"). Picked or dropped files join `ImportChoices.songs`, a keyed list, after the
songs already in it, and are read one at a time in the order picked by `import/music-pick.ts`
(`readPickedMusic`, the music editor's too): the format is recognised from the file's first bytes
(`src/import/music-format.ts`); MP3, AAC, FLAC, Opus and PCM WAV are kept as they are; ALAC, AIFF,
CAF, AC-3/E-AC-3, WMA, AMR and Ogg Vorbis, which a target browser cannot decode, are converted on
the device to a FLAC copy, and only the copy is stored (ADR-0020).

Once a song is in, the row "Your own music" stays above the song list, the music editor's
(`SongList.svelte`, without selecting): per song a grip, its number in its colour, the picked
name, "1:00 · WAV" (a converted one adds "Converted from Apple Lossless on this device"), "from
0:57" where it starts in the slideshow or, dimmed, "Not reached", and × removing it (cancelling its
conversion). The grip drags the song onto another row or moves it with the arrow keys while
focused (ADR-0019's pattern). A song being read is a dashed row with its name ("Converting to FLAC
· 42 %" while converting); a file that cannot be read or converted, or is copy-protected (an iTunes
`drms` track), is a coral row "This file can't be used" until its ×. The songs are placed as the
slideshow will play them, each crossfading into the next (ADR-0023).

With a song chosen, a panel holds the **Picture length** choice — "About 5 s each" (the default)
with its stepper, or "Fill the music" — and a strip of the pictures' thumbnails over the songs as
numbered blocks in their colours, both to one scale, a song not reached dimmed; under it "24
pictures · 2:00" and "Music 2:54".

**How the music and pictures end** (ADR-0047): automatic pictures (own or mood seconds, never
"Fill the music", which already fills) that would outlast a shorter playlist shrink evenly first —
down to ⅔ of their length, never below `MIN_SLIDE_DURATION_MS` (2 s) — to end with it: a mint note
"Pictures about 4.4 s each, to end with the music." If even that floor is not enough, pictures keep
their full length and a lemon note "The music ends 0:08 before the pictures" offers "Repeat the
music" (sets `StoredSlideshow.repeatMusic`: the whole playlist plays again from its first song,
crossfading, for as long as the slideshow lasts) or "Add a song" (the same file picker). Once
repeating, the note reads "The music repeats · fades out with the last picture.", with "Play once"
turning it off again. A music longer than the slideshow is unchanged: "The music fades out with the
last picture." (with a song not reached "…; the dimmed songs are not reached."); exactly as long,
"The slideshow ends with the music." No waveform is shown, as only the duration is probed.

Without a chosen song, a card "Time per picture" holds the seconds per picture (default 5 s). The
row "n pictures | x s per picture | m:ss total" follows the composition rules (`src/compose/`).

"Pictures" goes back; while a song is read the primary button is disabled as "Converting …";
otherwise "Create slideshow" (or "Create without music") stores every chosen song in the list's
order and then the slideshow record under the blocking overlay "Creating slideshow …", opens the
slideshow and shows the toast "Slideshow created — tap Play".
