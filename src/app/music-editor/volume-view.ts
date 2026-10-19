import { levelSong } from "../../loudness";
import { MUSIC_VOLUME_MAX_DB, MUSIC_VOLUME_MIN_DB } from "../../library/own-music";
import type { LoudnessStatus } from "../loudness/music-loudness-known";

/** The readout's second line (ADR-0040). */
export type VolumeSub =
  | { readonly kind: "unmeasured" }
  | { readonly kind: "asFarAsItGoes" }
  | { readonly kind: "sameLoudness" }
  | { readonly kind: "louder" }
  | { readonly kind: "quieter" };

/** The hint under the slider; absent (`"none"`) once nothing more needs saying. */
export type VolumeHint =
  | { readonly kind: "measuring" }
  | { readonly kind: "undecodable" }
  | { readonly kind: "cappedShort"; readonly shortDb: number }
  | { readonly kind: "cappedMax" }
  | { readonly kind: "levelledBy"; readonly levelDb: number }
  | { readonly kind: "none" };

/** What the music editor's "Volume" section shows for one song. */
export interface VolumeView {
  readonly measured: boolean;
  readonly ownDb: number;
  readonly levelled: boolean;
  /** Target minus the excerpt's loudness; 0 while unmeasured. */
  readonly levelDb: number;
  /** The highest own dB the slider reaches, clamped to its own range. */
  readonly capDb: number;
  /** Whether `capDb` falls short of the slider's top, so part of it is out of reach. */
  readonly capReached: boolean;
  /** Whether `ownDb` is already at (or past) `capDb`. */
  readonly atCap: boolean;
  /** How far short of the target loudness levelling alone stays; 0 unless the peak ceiling caps it before it gets there. */
  readonly shortDb: number;
  readonly sub: VolumeSub;
  readonly hint: VolumeHint;
}

export interface VolumeViewInput {
  readonly status: "known" | "listening" | "undecodable";
  /** From `excerptLoudnessLufs`/`excerptPeakDbfs` of the played excerpt; `null` unless `status` is `"known"`. */
  readonly loudnessLufs: number | null;
  readonly peakDbfs: number | null;
  readonly ownDb: number;
}

/**
 * The "Volume" section's view: own volume atop the level that brings the excerpt to the target
 * loudness, never past the peak ceiling (dev-docs/library/MUSIC.md "Loudness levelling and song
 * volume"). Pure: everything it needs is passed in.
 */
export function volumeView({ status, loudnessLufs, peakDbfs, ownDb }: VolumeViewInput): VolumeView {
  const measured = status === "known";
  const { levelDb, maxOwnDb } = levelSong({ loudnessLufs, peakDbfs, ownDb });
  const capDb = Math.max(MUSIC_VOLUME_MIN_DB, Math.min(MUSIC_VOLUME_MAX_DB, maxOwnDb));
  const capReached = capDb < MUSIC_VOLUME_MAX_DB;
  const atCap = ownDb >= capDb;
  const shortDb = Math.max(0, -maxOwnDb);
  const levelled = ownDb === 0;

  const sub: VolumeSub = !measured
    ? { kind: "unmeasured" }
    : levelled
      ? shortDb > 0
        ? { kind: "asFarAsItGoes" }
        : { kind: "sameLoudness" }
      : ownDb > 0
        ? { kind: "louder" }
        : { kind: "quieter" };

  const hint: VolumeHint =
    status === "listening"
      ? { kind: "measuring" }
      : status === "undecodable"
        ? { kind: "undecodable" }
        : shortDb > 0 && atCap
          ? { kind: "cappedShort", shortDb: Math.round(shortDb) }
          : atCap && capReached
            ? { kind: "cappedMax" }
            : levelled
              ? { kind: "levelledBy", levelDb }
              : { kind: "none" };

  return { measured, ownDb, levelled, levelDb, capDb, capReached, atCap, shortDb, sub, hint };
}

/** `volumeView`'s input from the song's loudness status and the excerpt it plays. */
export function volumeViewInput(
  status: LoudnessStatus,
  loudnessLufs: number | null,
  peakDbfs: number | null,
  ownDb: number,
): VolumeViewInput {
  return {
    status: status.kind,
    loudnessLufs: status.kind === "known" ? loudnessLufs : null,
    peakDbfs: status.kind === "known" ? peakDbfs : null,
    ownDb,
  };
}
