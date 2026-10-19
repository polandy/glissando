/**
 * A song's playback gain: levelled to the target loudness, then the song's own volume applied,
 * never past the peak ceiling (dev-docs/library/MUSIC.md "Loudness levelling and song volume").
 */

/** Every song is levelled to sound this loud, regardless of its own mastering. */
export const MUSIC_TARGET_LOUDNESS_LUFS = -14;
/** Playback never pushes a sample past this, so levelling and own volume together never clip. */
export const MUSIC_PEAK_CEILING_DBFS = -1;

export interface SongLevel {
  /** target − excerptLoudness; 0 when the loudness is not measured or the excerpt is silent. */
  readonly levelDb: number;
  readonly gainDb: number;
  /** Whether the peak ceiling, not the requested level, decided `gainDb`. */
  readonly capped: boolean;
  /** The highest own dB that would not be capped, whole dB (`Infinity` when no peak is known). */
  readonly maxOwnDb: number;
}

export interface SongLevelInput {
  readonly loudnessLufs: number | null;
  readonly peakDbfs: number | null;
  readonly ownDb: number;
}

export function decibelsToGain(db: number): number {
  return 10 ** (db / 20);
}

export function levelSong({ loudnessLufs, peakDbfs, ownDb }: SongLevelInput): SongLevel {
  const levelDb = loudnessLufs === null ? 0 : MUSIC_TARGET_LOUDNESS_LUFS - loudnessLufs;
  const requestedGainDb = levelDb + ownDb;
  const ceilingGainDb = peakDbfs === null ? Infinity : MUSIC_PEAK_CEILING_DBFS - peakDbfs;

  return {
    levelDb,
    gainDb: Math.min(requestedGainDb, ceilingGainDb),
    capped: ceilingGainDb < requestedGainDb,
    maxOwnDb: peakDbfs === null ? Infinity : Math.floor(ceilingGainDb - levelDb),
  };
}
