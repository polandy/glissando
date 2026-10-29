# User guide

## Get Glissando

Open <https://polandy.github.io/glissando/> and install it: **Add to Home Screen** on a phone or
tablet, the **install icon** in the address bar on a computer. After the first load it works
without internet. If you use a self-hosted Glissando, open its address instead
([self-hosting](self-hosting.md)).

## Make a slideshow

1. **New slideshow** and choose pictures from the device (or from Immich, on a self-hosted
   Glissando). They are ordered by capture date, and the originals stay untouched.
2. **Add music**: any common format (MP3, M4A, Ogg, FLAC, WAV …), or pick from the nine sample
   tracks that come with Glissando if you have none of your own to hand. Pick the part of the song
   to use; the slideshow is timed to fit it. Several songs work too, automatically matched in
   loudness so none plays louder than the rest; the music editor lets you listen and adjust that.
3. **Play.** Motion and transitions are chosen for you — people stay in frame, scenery gets a slow
   sweep, changes follow the beat.

For a different feel, tap Mood beside Music and Look on the slideshow's screen. **Calm** shows each
picture longer, with soft crossfades and gentle motion; **Lively** changes pictures quickly with
mixed transitions and stronger motion. Both fit the picture changes to the song's beats and phrases,
so a slow and a fast song pace the same mood differently. A new slideshow starts on Calm; choose
**Custom**, or set your own time per picture or "Fill the music" in the music editor, to use your
own settings. A slideshow without music sets its time per picture in the music editor too, below
"No music yet". A picture with its own duration, transition or motion keeps it under any mood, and
changing a single setting while a mood is on turns it into Custom with the mood's values to start
from.

Turn on **Follow the music's energy** in the Mood sheet, under any mood or Custom, and the pictures
stay longer where the music is quiet and change quicker where it is loud; at a drop or chorus the
next picture cuts in on the beat. The slideshow stays as long as before, and pictures with their own
duration keep it.

Tap Look on the slideshow's screen to give it a look — Warm, Cool, Vivid, Film, Black & white or
Faded — if you want one. It colours every picture and video, in the exported video and web page
too; the title and closing slides and the captions stay as they are.

<p align="center">
  <img src="images/add-pictures.png" alt="Adding pictures to a slideshow" width="760">
</p>

While pictures are still coming in, you don't have to wait: view, remove or drag the ones already
there to set your own order — new ones join by capture date until you do — and keep adding more
(another folder, or more from Immich) while it runs.

Adding pictures later skips the ones already in the slideshow (you can add them anyway). Drag
pictures to reorder, or tap Shuffle for a random order (Undo in the message that follows
brings the old one back); select a picture to view it full screen or open its editor to change
its motion (on a phone it shows the picture with its frames or the preview, one at a time:
switch with **Frame | Play**). The bar that appears shows its actions as icons: rest the mouse on one, or press and
hold it with a finger, to see what it does.

**Trip chapters**: a slideshow of several days in different places gets a chapter slide between
them automatically, naming the place and the dates. Tap a chapter tile in the picture strip to
rename it, hide it, or reset it to its automatic text; select a picture and tap **Insert chapter before**
to add one of your own, or delete it again from its sheet. The **Trip chapters** row in the
slideshow's side panel, under **Fine settings**, is where automatic chapters are turned on or off
for the whole slideshow, and shows how many there currently are.

## Play

| Key / gesture | Does             |
| ------------- | ---------------- |
| Space / tap   | Play, pause      |
| ← →           | Previous, next   |
| Esc           | Close the player |

## Keep and share

All of it is behind the **Share** button next to the slideshow's title. It opens a list in two
groups; choose a row and its sheet opens, with **Back** to the list.

- **Watch by link** needs a self-hosted Glissando ([self-hosting](self-hosting.md)): a link anyone
  can watch, which stays up to date until you turn it off.
- **Video**: an MP4 you can send or put on a TV stick.
- **Web page**: one file that plays in any browser, no Glissando needed.
- **Glissando file**: **Save file** moves a slideshow with its pictures, music and settings to another
  device; import it there. Glissando checks a file whole, every picture and song included, before
  it keeps anything of it, and refuses a file that is damaged or not what it claims to be. The
  file is a ZIP: rename it to `.zip` to look inside. A copy you unpacked, edited and zipped again
  (the folder itself or its contents) still opens; missing thumbnails are made again, also where you deleted a picture's `thumbnail`
  line from `glissando.json`. Inside, `README.txt` says what each entry is, and
  `glissando.schema.json` describes `glissando.json` as a JSON Schema. To watch it without
  Glissando, unpack the whole file and open `index.html` in a browser; Firefox plays at once,
  Chrome, Edge and Safari ask you to choose the unpacked folder first. It plays what
  `glissando.json` says, so your edits show.
- **TV, picture frame** need a self-hosted Glissando ([self-hosting](self-hosting.md)): a TV you
  control from the phone (`/tv`), and an Immich album played endlessly (the Picture frame card,
  or Settings).

## Good to know

- If the music is a little shorter than the pictures, they shrink to fit it on their own. If it
  ends well before the pictures do, the music editor offers to **Repeat the music** or **Add a
  song**.
- Glissando looks for faces and other subjects in the background, so motion aims well; a card shows
  how far it got, and **Faces and subjects …** in a slideshow's ⋯ menu lets you look again at any picture,
  including one it couldn't look at the first time.
- Your pictures stay on your device. Nothing is uploaded unless you use a server you run yourself.
- Ask the browser to keep the data (Glissando requests it); clearing site data deletes slideshows
  stored on the device — export a `.glissando` file as a backup.
- Language and light/dark follow your device; both can be changed in Settings.
