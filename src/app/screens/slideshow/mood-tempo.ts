import { moodTempo } from "../../../compose/mood-settings";
import type { SongBeats } from "../../../compose/playlist";
import { EVEN_PICTURE_CHANGES } from "../../../library/own-music";
import type { BeatPassState } from "../../../library/beat-pass";
import type { StoredMusic, StoredSlideshow } from "../../../library/stored-slideshow";
import { beatsStatus, composedBeats } from "../../beats/music-beats-known";

/**
 * The slideshow's mood tempo (MOOD.md "Rows it sets"): each song's beats as already stored,
 * overtaken by whatever the background pass has found this session (`BeatPass`); `undefined`
 * without a clear beat to pace to. Worked out under Custom too, so the Mood sheet's preview names
 * the same tempo whichever tile is checked.
 */
export function slideshowMoodBpm(
  stored: Pick<StoredSlideshow, "songs">,
  storedBeats: SongBeats,
  pass: BeatPassState,
): number | undefined {
  const beats: SongBeats = new Map(
    stored.songs.map((song: StoredMusic) => [
      song.id,
      composedBeats(beatsStatus(song.id, storedBeats.get(song.id), pass)),
    ]),
  );
  return moodTempo(stored, beats);
}

/**
 * Whether the mood's tempo (`slideshowMoodBpm`) is still undecided: no tempo found yet, but a song
 * that could still give one is not opted into even picture changes and has not finished being
 * listened to. The preview badge shows a neutral state meanwhile, never "no beat found" (MOOD.md).
 */
export function slideshowMoodTempoPending(
  stored: Pick<StoredSlideshow, "songs">,
  storedBeats: SongBeats,
  pass: BeatPassState,
): boolean {
  if (slideshowMoodBpm(stored, storedBeats, pass) !== undefined) {
    return false;
  }
  return stored.songs.some(
    (song: StoredMusic) =>
      song.pictureChanges !== EVEN_PICTURE_CHANGES &&
      beatsStatus(song.id, storedBeats.get(song.id), pass).kind === "listening",
  );
}
