import type { Message } from "./messages.ts";

/** German copy of the sample-music picker: its accordion block, cards and credit (SAMPLE_MUSIC.md). */
export const deSampleMusicPicker = {
  "sampleMusicPicker.blockTitle": "Glissando-Musik",
  "sampleMusicPicker.blockSubtitle": "{count} Songs · gehören zu Glissando",
  "sampleMusicPicker.or": "oder",
  "sampleMusicPicker.showAll": "Alle {count} zeigen",
  "sampleMusicPicker.showFewer": "Weniger zeigen",
  "sampleMusicPicker.addTrack": "{title} hinzufügen",
  "sampleMusicPicker.removeTrack": "{title} entfernen",
  "sampleMusicPicker.playTrack": "{title} abspielen",
  "sampleMusicPicker.pauseTrack": "{title} anhalten",
  "sampleMusicPicker.onDevice": "Auf diesem Gerät",
  "sampleMusicPicker.needsConnection": "Verbindung nötig",
  "sampleMusicPicker.offlineNotice":
    "Du bist offline. Songs, die schon auf diesem Gerät sind, lassen sich hinzufügen; die anderen anzuhören braucht eine Verbindung.",
  "sampleMusicPicker.previewError":
    "Dieser Song ließ sich nicht abspielen — versuch es noch einmal",
  "sampleMusicPicker.downloading": "Wird heruntergeladen · {percent} %",
  "sampleMusicPicker.downloadFailed": "Dieser Song lässt sich nicht herunterladen",
  "sampleMusicPicker.footer":
    "Musik: Glissando, CC BY-NC 4.0 · frei für nicht-kommerzielle Nutzung",
  "sampleMusicPicker.moodHoldTheFrame": "Sehr ruhig · minimal · Porträts",
  "sampleMusicPicker.moodThroughTheRainSlickedGlass": "Warm · harmonisch · melancholisch",
  "sampleMusicPicker.moodBeforeTheWorldAwakens": "Warm · harmonisch · alltäglich",
  "sampleMusicPicker.moodSevenFloorsAbove": "Urban · modern · schwebend",
  "sampleMusicPicker.moodMorningLatitude": "Fröhlich · hell · beschwingt",
  "sampleMusicPicker.moodTopDownCruising": "Sonnig · beschwingt · Roadtrip",
  "sampleMusicPicker.moodArrivalAtDawn": "Festlich · filmisch · offen",
  "sampleMusicPicker.moodWhereTheMountainsMeet": "Festlich · filmisch · weit",
  "sampleMusicPicker.moodTheViewFromTheSummit": "Episch · hymnisch",
} as const satisfies Record<string, Message>;
