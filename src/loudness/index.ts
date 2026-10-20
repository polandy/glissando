/**
 * Pure ITU-R BS.1770-4 loudness measurement and song-volume levelling
 * (dev-docs/library/MUSIC.md "Loudness levelling and song volume"). Framework-free: no DOM, no
 * Web Audio, no Svelte.
 */
export { excerptLoudnessLufs } from "./excerpt-loudness";
export { excerptPeakDbfs } from "./excerpt-peak";
export {
  decibelsToGain,
  levelSong,
  MUSIC_PEAK_CEILING_DBFS,
  MUSIC_TARGET_LOUDNESS_LUFS,
  type SongLevel,
  type SongLevelInput,
} from "./level-song";
export { loudestStretchStartMs } from "./loudest-stretch";
export {
  LOUDNESS_BLOCK_MS,
  LOUDNESS_HOP_MS,
  measureLoudness,
  type MusicLoudness,
} from "./measure-loudness";
export { musicLoudnessToJson, parseMusicLoudness } from "./music-loudness-json";
