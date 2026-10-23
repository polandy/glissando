import { moodTempo } from "../../../compose/mood-settings";
import type { SongBeats } from "../../../compose/playlist";
import type { BeatPassState } from "../../../library/beat-pass";
import type { StoredMusic, StoredSlideshow } from "../../../library/stored-slideshow";
import { beatsStatus, composedBeats } from "../../beats/music-beats-known";

/**
 * The slideshow's mood tempo (MOOD.md "Rows it sets"): each song's beats as already stored,
 * overtaken by whatever the background pass has found this session (`BeatPass`); `undefined`
 * without a mood, or without a clear beat to pace to.
 */
export function slideshowMoodBpm(
  stored: Pick<StoredSlideshow, "mood" | "songs">,
  storedBeats: SongBeats,
  pass: BeatPassState,
): number | undefined {
  if (stored.mood === undefined) {
    return undefined;
  }
  const beats: SongBeats = new Map(
    stored.songs.map((song: StoredMusic) => [
      song.id,
      composedBeats(beatsStatus(song.id, storedBeats.get(song.id), pass)),
    ]),
  );
  return moodTempo(stored, beats);
}
