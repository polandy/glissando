import type { KeyValueStorage } from "../start/first-launch";
import { createStoredChoice, type StoredChoice } from "../settings/stored-choice";

const MUSIC_EDITOR_DETAILS_CHOICES = ["shown", "hidden"] as const;
export type MusicEditorDetails = (typeof MUSIC_EDITOR_DETAILS_CHOICES)[number];
export type MusicEditorDetailsStore = StoredChoice<MusicEditorDetails>;

const MUSIC_EDITOR_DETAILS_KEY = "glissando.musicEditorDetails";

/** Whether the music editor's "Details" switch is on (the volume line, beat ticks, the
 * slideshow lane under the waveform, crossfade hatching), remembered per device for every
 * slideshow. Starts hidden: the editor shows simple first (MUSIC_EDITOR.md). */
export function createStorageMusicEditorDetailsStore(
  storage: KeyValueStorage,
): MusicEditorDetailsStore {
  return createStoredChoice(
    storage,
    MUSIC_EDITOR_DETAILS_KEY,
    MUSIC_EDITOR_DETAILS_CHOICES,
    "hidden",
  );
}
