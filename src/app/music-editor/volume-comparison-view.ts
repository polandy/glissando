import { musicExcerpt } from "../../compose";
import { excerptLoudnessLufs, excerptPeakDbfs, levelSong } from "../../loudness";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { songLoudnessStatus, type SongsLoudnessStatus } from "./slideshow-times";

/** The axis the comparison bars scale across, in LUFS: as quiet as the box ever shows. */
const COMPARISON_MIN_LUFS = -30;
/** The axis the comparison bars scale across, in LUFS: as loud as the box ever shows. */
const COMPARISON_MAX_LUFS = -4;
const COMPARISON_RANGE_LUFS = COMPARISON_MAX_LUFS - COMPARISON_MIN_LUFS;

/** One song's row in the "Loudness of the songs" box. */
export type VolumeComparisonRow =
  | { readonly id: string; readonly number: number; readonly measured: false }
  | {
      readonly id: string;
      readonly number: number;
      readonly measured: true;
      /** The excerpt's own, unlevelled loudness: the grey line, 0..100 along the bar. */
      readonly originalPercent: number;
      /** Where it ends up once levelled and its own volume are applied, 0..100 along the bar. */
      readonly nowPercent: number;
      readonly nowLufs: number;
      readonly ownDb: number;
      /** Plays at the level that brings it to the target loudness, with no own volume atop it. */
      readonly levelled: boolean;
    };

export type VolumeComparisonView = readonly VolumeComparisonRow[];

/**
 * The "Loudness of the songs" box: each song's own loudness (the grey line) against where it
 * ends up once levelled and its own volume are applied, on the same axis (dev-docs/library/
 * MUSIC.md "Loudness levelling and song volume"). Pure: everything it needs is passed in.
 */
export function volumeComparisonView(
  stored: StoredSlideshow,
  loudness: SongsLoudnessStatus,
): VolumeComparisonView {
  return stored.songs.map((song, index) => {
    const number = index + 1;
    const status = songLoudnessStatus(loudness, song.id);
    if (status.kind !== "known") return { id: song.id, number, measured: false };

    const { startMs, endMs } = musicExcerpt(song);
    const loudnessLufs = excerptLoudnessLufs(status.loudness, startMs, endMs);
    // Gated down to nothing (a silent excerpt): nothing to plot, same as still measuring.
    if (loudnessLufs === null) return { id: song.id, number, measured: false };
    const peakDbfs = excerptPeakDbfs(status.loudness, startMs, endMs);
    const ownDb = song.volumeDb ?? 0;
    const { gainDb } = levelSong({ loudnessLufs, peakDbfs, ownDb });
    const nowLufs = loudnessLufs + gainDb;
    return {
      id: song.id,
      number,
      measured: true,
      originalPercent: comparisonPercent(loudnessLufs),
      nowPercent: comparisonPercent(nowLufs),
      nowLufs,
      ownDb,
      levelled: ownDb === 0,
    };
  });
}

function comparisonPercent(lufs: number): number {
  const fraction = (lufs - COMPARISON_MIN_LUFS) / COMPARISON_RANGE_LUFS;
  return Math.max(0, Math.min(100, fraction * 100));
}
