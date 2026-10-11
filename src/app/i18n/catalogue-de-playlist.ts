import type { Message } from "./messages";

/** German copy of the playlist: its songs in the panel, the music editor and the import. */
export const dePlaylist = {
  "slideshow.addMusic": "Musik hinzufügen",
  "music.reason-crossfade-from-previous": "die Überblendung vom vorigen Song",
  "music.reason-crossfade-into-next": "die Überblendung in den nächsten Song",
  "music.songs": "Songs",
  "music.songFrom": "ab {time}",
  "music.notReached": "Nicht erreicht",
  "music.moveSong": "{name} verschieben",
  "music.removeSong": "{name} entfernen",
  "music.addSong": "Song hinzufügen",
  "music.addSongs": "Songs hinzufügen",
  "music.songConverting": "Wird in FLAC umgewandelt\u00a0· {percent}\u00a0%",
  "music.songUnusable": "Diese Datei lässt sich nicht verwenden",
  "music.playlistLane": {
    one: "Playlist, 1 Song · {duration}",
    other: "Playlist, {count} Songs · {duration}",
  },
  "music.crossfadesHatched": "Überblendungen schraffiert",
  "music.slideshowLaneTotal": {
    one: "Diashow, 1 Bild · {duration}",
    other: "Diashow, {count} Bilder · {duration}",
  },
  "music.laneFadesOut": "Die Musik blendet mit dem letzten Bild aus",
  "music.laneSilent": "Die letzten Bilder ohne Musik",
  "music.laneEndsWith": "Endet mit der Musik",
  "music.slideshowEnds": "Die Diashow endet",
  "music.sectionSlideshow": "Diashow",
  "music.sectionSong": "Song {number}",
  "music.songHeading": "Song {number} · {name}",
  "music.betweenSongs": "Zwischen den Songs",
  "music.crossfade": "Überblenden",
  "music.sequence": "Nacheinander",
  "music.crossfadeWhy": "Der nächste Song beginnt, während der vorige ausblendet.",
  "music.sequenceWhy": "Der nächste Song beginnt, wenn der vorige ausgeblendet hat.",
  "music.noMusicYet": "Noch keine Musik",
  "music.noMusicWhy":
    "Füge einen Song hinzu oder mehrere; sie laufen nacheinander und die Bilder wechseln auf ihren Takt.",
  "music.songNotReached":
    "Die Diashow endet, bevor dieser Song beginnt; er läuft, sobald sie länger wird.",
  "music.songRemoved": "Song entfernt",
  "slideshow.songCount": { one: "1 Song", other: "{count} Songs" },
} as const satisfies Record<string, Message>;
