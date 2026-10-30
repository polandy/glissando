import type { Catalogue } from "./messages.ts";
import type { dePlaylist } from "./catalogue-de-playlist.ts";

/** English copy of the playlist; typed to the German keys. */
export const enPlaylist: Pick<Catalogue, keyof typeof dePlaylist> = {
  "slideshow.addMusic": "Add music",
  "music.reason-crossfade-from-previous": "the crossfade from the previous song",
  "music.reason-crossfade-into-next": "the crossfade into the next song",
  "music.songs": "Songs",
  "music.songFrom": "from {time}",
  "music.notReached": "Not reached",
  "music.moveSong": "Move {name}",
  "music.removeSong": "Remove {name}",
  "music.addSong": "Add a song",
  "music.done": "Done",
  "music.songConverting": "Converting to FLAC\u00a0· {percent}\u00a0%",
  "music.songUnusable": "This file can't be used",
  "music.sampleBadge": "Sample",
  "music.playlistLane": {
    one: "Playlist, 1 song · {duration}",
    other: "Playlist, {count} songs · {duration}",
  },
  "music.crossfadesHatched": "Crossfades hatched",
  "music.slideshowLaneTotal": {
    one: "Slideshow, 1 picture · {duration}",
    other: "Slideshow, {count} pictures · {duration}",
  },
  "music.laneFadesOut": "Music fades out with the last picture",
  "music.laneEndsWith": "Ends with the music",
  "music.laneFitted": "Pictures about {seconds} each, to end with the music.",
  "music.laneOutlasts": "The music ends {time} before the pictures",
  "music.laneRepeats": "Music repeats · fades out with the last picture",
  "music.playlistRepeats": "Repeats until the slideshow ends",
  "music.repeatMusic": "Repeat the music",
  "music.repeatMusicOnHint": "Plays the songs again while pictures remain",
  "music.repeatMusicOffHint": "Off: a shorter music is fitted or offers a fix instead.",
  "music.slideshowEnds": "Slideshow ends",
  "music.sectionSlideshow": "Slideshow",
  "music.sectionSong": "Song {number}",
  "music.songHeading": "Song {number} · {name}",
  "music.betweenSongs": "Between songs",
  "music.crossfade": "Crossfade",
  "music.sequence": "One after another",
  "music.crossfadeWhy": "The next song starts while the previous one fades out.",
  "music.sequenceWhy": "The next song starts once the previous one has faded out.",
  "music.noMusicYet": "No music yet",
  "music.noMusicWhy":
    "Add one song or several; they play one after another and the pictures change on their beat.",
  "music.songNotReached":
    "The slideshow ends before this song starts; it plays once the slideshow grows.",
  "music.songRemoved": "Song removed",
  "slideshow.songCount": { one: "1 song", other: "{count} songs" },
};
