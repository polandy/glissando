import {
  decibelsToGain,
  excerptLoudnessLufs,
  excerptPeakDbfs,
  levelSong,
  type MusicLoudness,
} from "../loudness";

export interface TrackGainInput {
  /** Absent when the song has not been listened to yet. */
  readonly loudness: MusicLoudness | undefined;
  /** The played excerpt, in ms of the song's own track (`PlaylistTrack.startMs`/`endMs`). */
  readonly startMs: number;
  readonly endMs: number;
  /** The song's own volume, `StoredMusic.volumeDb ?? 0`. */
  readonly ownDb: number;
}

/**
 * The one linear gain a track plays at, player and video export alike (ADR-0040): the excerpt
 * levelled to the target loudness, the song's own volume added on top, never past the peak
 * ceiling. A song not measured yet plays at its own volume alone (`levelDb` 0).
 */
export function trackGain({ loudness, startMs, endMs, ownDb }: TrackGainInput): number {
  const loudnessLufs =
    loudness === undefined ? null : excerptLoudnessLufs(loudness, startMs, endMs);
  const peakDbfs = loudness === undefined ? null : excerptPeakDbfs(loudness, startMs, endMs);
  const { gainDb } = levelSong({ loudnessLufs, peakDbfs, ownDb });
  return decibelsToGain(gainDb);
}
