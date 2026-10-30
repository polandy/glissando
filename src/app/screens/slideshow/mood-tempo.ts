import { moodTempo } from "../../../compose/mood-settings";
import type { SongBeats } from "../../../compose/playlist";
import type { BeatPassState } from "../../../library/beat-pass";
import type { StoredMusic, StoredSlideshow } from "../../../library/stored-slideshow";
import { beatsStatus, composedBeats } from "../../beats/music-beats-known";

/**
 * Each of the slideshow's songs' beats as already stored, overtaken by whatever the background
 * pass has found this session (`BeatPass`): the live preview (MoodPreview.svelte) composes and
 * paces to this same map, so it re-paces once a song it is still listening to gets a result.
 */
export function composedSongBeats(
  stored: Pick<StoredSlideshow, "songs">,
  storedBeats: SongBeats,
  pass: BeatPassState,
): SongBeats {
  return new Map(
    stored.songs.map((song: StoredMusic) => [
      song.id,
      composedBeats(beatsStatus(song.id, storedBeats.get(song.id), pass)),
    ]),
  );
}

/**
 * The slideshow's mood tempo (MOOD.md "What it sets"): `undefined` without a clear beat to pace
 * to. Worked out under Custom too, so the Mood sheet's tiles pace to the same tempo whichever
 * one is checked.
 */
export function slideshowMoodBpm(
  stored: Pick<StoredSlideshow, "songs">,
  storedBeats: SongBeats,
  pass: BeatPassState,
): number | undefined {
  return moodTempo(stored, composedSongBeats(stored, storedBeats, pass));
}
