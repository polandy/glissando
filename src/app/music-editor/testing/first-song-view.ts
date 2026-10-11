import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { BeatsStatus } from "../../beats/music-beats-known";
import { musicEditorView, type MusicEditorView } from "../music-editor-view";

/** The music editor's view of the slideshow's first song, whose beats are `status`. */
export function firstSongView(stored: StoredSlideshow, status: BeatsStatus): MusicEditorView {
  const [first] = stored.songs;
  if (first === undefined) {
    throw new Error(`slideshow "${stored.id}" has no song to view`);
  }
  return musicEditorView(stored, new Map([[first.id, status]]), first.id);
}
