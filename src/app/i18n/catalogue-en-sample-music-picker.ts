import type { Catalogue } from "./messages.ts";
import type { deSampleMusicPicker } from "./catalogue-de-sample-music-picker.ts";

/** English copy of the sample-music picker; typed to the German keys. */
export const enSampleMusicPicker: Pick<Catalogue, keyof typeof deSampleMusicPicker> = {
  "sampleMusicPicker.tabMyMusic": "My music",
  "sampleMusicPicker.tabSampleMusic": "Sample music",
  "sampleMusicPicker.add": "Add",
  "sampleMusicPicker.added": "✓ Added",
  "sampleMusicPicker.playTrack": "Play {title}",
  "sampleMusicPicker.pauseTrack": "Pause {title}",
  "sampleMusicPicker.onDevice": "On this device",
  "sampleMusicPicker.needsConnection": "Needs a connection",
  "sampleMusicPicker.offlineNotice":
    "You are offline. Tracks already on this device can be added; listening to the others needs a connection.",
  "sampleMusicPicker.previewError": "Couldn't play this song — try again",
  "sampleMusicPicker.downloading": "Downloading · {percent} %",
  "sampleMusicPicker.downloadFailed": "Couldn't download this song",
  "sampleMusicPicker.footer": "Music: Glissando, CC BY-NC 4.0 · free for non-commercial use",
  "sampleMusicPicker.moodHoldTheFrame": "Very calm · minimal · portraits",
  "sampleMusicPicker.moodThroughTheRainSlickedGlass": "Warm · harmonious · melancholic",
  "sampleMusicPicker.moodBeforeTheWorldAwakens": "Warm · harmonious · everyday",
  "sampleMusicPicker.moodSevenFloorsAbove": "Urban · modern · floating",
  "sampleMusicPicker.moodMorningLatitude": "Cheerful · bright · upbeat",
  "sampleMusicPicker.moodTopDownCruising": "Sunny · upbeat · road trip",
  "sampleMusicPicker.moodArrivalAtDawn": "Festive · cinematic · open",
  "sampleMusicPicker.moodWhereTheMountainsMeet": "Festive · cinematic · wide",
  "sampleMusicPicker.moodTheViewFromTheSummit": "Epic · anthemic",
};
