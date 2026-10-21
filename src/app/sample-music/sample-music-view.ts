import type { MessageKey } from "../i18n/messages";
import type { SampleTrackId } from "../../sample-music/sample-tracks";

/** Each track's mood, in the message catalogue (SAMPLE_MUSIC.md, the catalogue table). */
export const SAMPLE_TRACK_MOOD_KEYS: Readonly<Record<SampleTrackId, MessageKey>> = {
  "hold-the-frame": "sampleMusicPicker.moodHoldTheFrame",
  "through-the-rain-slicked-glass": "sampleMusicPicker.moodThroughTheRainSlickedGlass",
  "before-the-world-awakens": "sampleMusicPicker.moodBeforeTheWorldAwakens",
  "seven-floors-above": "sampleMusicPicker.moodSevenFloorsAbove",
  "morning-latitude": "sampleMusicPicker.moodMorningLatitude",
  "top-down-cruising": "sampleMusicPicker.moodTopDownCruising",
  "arrival-at-dawn": "sampleMusicPicker.moodArrivalAtDawn",
  "where-the-mountains-meet": "sampleMusicPicker.moodWhereTheMountainsMeet",
  "the-view-from-the-summit": "sampleMusicPicker.moodTheViewFromTheSummit",
};

/**
 * A card's status line (SAMPLE_MUSIC.md, On this device & Offline): "On this device" once its
 * media is stored, else "Needs a connection" while offline; no line once online with nothing
 * stored yet.
 */
export function sampleCardStatusKey(online: boolean, onDevice: boolean): MessageKey | undefined {
  if (onDevice) return "sampleMusicPicker.onDevice";
  return online ? undefined : "sampleMusicPicker.needsConnection";
}

/** A card is disabled, dimmed and without its play button, only offline and not on this device. */
export function sampleCardDisabled(online: boolean, onDevice: boolean): boolean {
  return !online && !onDevice;
}
