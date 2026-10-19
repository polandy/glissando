import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { BeatsStatus } from "../../beats/music-beats-known";
import type { LoudnessStatus } from "../../loudness/music-loudness-known";
import { musicEditorView, type MusicEditorView } from "../music-editor-view";

/**
 * The music editor's view of the slideshow's first song, whose beats are `status` and whose
 * loudness is `loudness` (still being listened for unless given).
 */
export function firstSongView(
  stored: StoredSlideshow,
  status: BeatsStatus,
  loudness?: LoudnessStatus,
): MusicEditorView {
  const [first] = stored.songs;
  if (first === undefined) {
    throw new Error(`slideshow "${stored.id}" has no song to view`);
  }
  return musicEditorView(
    stored,
    new Map([[first.id, status]]),
    first.id,
    loudness === undefined ? undefined : new Map([[first.id, loudness]]),
  );
}
