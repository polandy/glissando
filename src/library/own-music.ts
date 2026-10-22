import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import type { StoredMusic } from "./stored-slideshow";

/**
 * The music's own excerpt, fades and picture changes, set in the music editor. Absent fields mean
 * the whole track, automatic fades and picture changes on the beat; the music file itself is
 * never changed. See ADR-0009 and ADR-0021.
 */

/** The part of the track that plays, in whole ms of the track. */
export interface MusicTrim {
  readonly startMs: number;
  readonly endMs: number;
}

/** The shortest excerpt the music can be trimmed to. */
export const MIN_MUSIC_EXCERPT_MS = 5 * MILLISECONDS_PER_SECOND;

export const MUSIC_FADE_OFF_MS = 0;
export const MUSIC_FADE_SHORT_MS = 2 * MILLISECONDS_PER_SECOND;
export const MUSIC_FADE_LONG_MS = 5 * MILLISECONDS_PER_SECOND;
/** What the music editor offers; stored as ms so free lengths stay possible. */
export const MUSIC_FADE_CHOICES_MS = [
  MUSIC_FADE_OFF_MS,
  MUSIC_FADE_SHORT_MS,
  MUSIC_FADE_LONG_MS,
] as const;
export const MAX_MUSIC_FADE_MS = 10 * MILLISECONDS_PER_SECOND;
export const MUSIC_FADE_STEP_MS = MILLISECONDS_PER_SECOND / 2;

/** The range a song's own volume can move it off the levelled default (0 dB, ADR-0040). */
export const MUSIC_VOLUME_MIN_DB = -12;
export const MUSIC_VOLUME_MAX_DB = 6;

/** The pictures change evenly, ignoring the beats; absent: on the beat when one was found. */
export const EVEN_PICTURE_CHANGES = "even";
export type PictureChanges = typeof EVEN_PICTURE_CHANGES;

/** The songs play one after another; absent: each crossfades into the next (ADR-0023). */
export const SEQUENCE_BETWEEN_SONGS = "sequence";
export type BetweenSongs = typeof SEQUENCE_BETWEEN_SONGS;

/** The music's fields this module checks. */
export type OwnMusicField =
  | "trim"
  | "fadeInMs"
  | "fadeOutMs"
  | "pictureChanges"
  | "betweenSongs"
  | "volumeDb"
  | "sampleTrack";

/** The longest a sample track's id is let be; ids are short catalogue slugs (`checkSampleTrack`). */
export const MAX_SAMPLE_TRACK_ID_LENGTH = 64;
const SAMPLE_TRACK_ID_PATTERN = /^[a-z0-9-]+$/;

const TRIM_KEYS: readonly string[] = ["startMs", "endMs"];

export class InvalidOwnMusicError extends Error {
  constructor(
    where: string,
    readonly field: OwnMusicField,
    readonly expected: string,
    readonly actual: unknown,
  ) {
    super(`${where} ${field}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "InvalidOwnMusicError";
  }
}

/** `value` as an excerpt of a track `durationMs` long; throws `InvalidOwnMusicError` naming `where`. */
export function checkMusicTrim(value: unknown, durationMs: number, where: string): MusicTrim {
  const expected = `{ startMs, endMs } in whole ms with 0 ≤ startMs, endMs ≤ ${durationMs} and endMs − startMs ≥ ${MIN_MUSIC_EXCERPT_MS}`;
  if (
    typeof value !== "object" ||
    value === null ||
    Object.keys(value).some((key) => !TRIM_KEYS.includes(key))
  ) {
    throw new InvalidOwnMusicError(where, "trim", expected, value);
  }
  const { startMs, endMs } = value as Readonly<Record<string, unknown>>;
  if (
    !isWholeNumber(startMs) ||
    !isWholeNumber(endMs) ||
    startMs < 0 ||
    endMs > durationMs ||
    endMs - startMs < MIN_MUSIC_EXCERPT_MS
  ) {
    throw new InvalidOwnMusicError(where, "trim", expected, value);
  }
  return { startMs, endMs };
}

/** `value` as an own fade; throws `InvalidOwnMusicError` naming `field` and `where`. */
export function checkMusicFadeMs(
  value: unknown,
  field: Extract<OwnMusicField, "fadeInMs" | "fadeOutMs">,
  where: string,
): number {
  if (
    !isWholeNumber(value) ||
    value < MUSIC_FADE_OFF_MS ||
    value > MAX_MUSIC_FADE_MS ||
    value % MUSIC_FADE_STEP_MS !== 0
  ) {
    throw new InvalidOwnMusicError(
      where,
      field,
      `whole milliseconds from ${MUSIC_FADE_OFF_MS} to ${MAX_MUSIC_FADE_MS} in steps of ${MUSIC_FADE_STEP_MS}`,
      value,
    );
  }
  return value;
}

/** `value` as an own choice of picture changes; throws `InvalidOwnMusicError` naming `where`. */
export function checkPictureChanges(value: unknown, where: string): PictureChanges {
  if (value !== EVEN_PICTURE_CHANGES) {
    throw new InvalidOwnMusicError(
      where,
      "pictureChanges",
      JSON.stringify(EVEN_PICTURE_CHANGES),
      value,
    );
  }
  return value;
}

/** `value` as a song's own volume, in whole dB off the levelled default; throws `InvalidOwnMusicError`. */
export function checkMusicVolumeDb(value: unknown, where: string): number {
  if (!isWholeNumber(value) || value < MUSIC_VOLUME_MIN_DB || value > MUSIC_VOLUME_MAX_DB) {
    throw new InvalidOwnMusicError(
      where,
      "volumeDb",
      `whole dB from ${MUSIC_VOLUME_MIN_DB} to ${MUSIC_VOLUME_MAX_DB}`,
      value,
    );
  }
  return value;
}

/**
 * `value` as a sample track's id — lowercase letters, digits and hyphens, never checked against
 * the sample-music catalogue, so a file stays readable when the catalogue changes (SAMPLE_MUSIC.md);
 * throws `InvalidOwnMusicError` naming `where`.
 */
export function checkSampleTrack(value: unknown, where: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_SAMPLE_TRACK_ID_LENGTH ||
    !SAMPLE_TRACK_ID_PATTERN.test(value)
  ) {
    throw new InvalidOwnMusicError(
      where,
      "sampleTrack",
      `lowercase letters, digits and hyphens, 1 to ${MAX_SAMPLE_TRACK_ID_LENGTH} characters`,
      value,
    );
  }
  return value;
}

/**
 * Checks a song's own fields as `checkMusicTrim`, `checkMusicFadeMs`, `checkPictureChanges`,
 * `checkMusicVolumeDb` and `checkSampleTrack` do; throws `InvalidOwnMusicError` naming `where`.
 */
export function checkOwnMusicFields(song: StoredMusic, where: string): void {
  if (song.trim !== undefined) checkMusicTrim(song.trim, song.durationMs, where);
  if (song.fadeInMs !== undefined) checkMusicFadeMs(song.fadeInMs, "fadeInMs", where);
  if (song.fadeOutMs !== undefined) checkMusicFadeMs(song.fadeOutMs, "fadeOutMs", where);
  if (song.pictureChanges !== undefined) checkPictureChanges(song.pictureChanges, where);
  if (song.volumeDb !== undefined) checkMusicVolumeDb(song.volumeDb, where);
  if (song.sampleTrack !== undefined) checkSampleTrack(song.sampleTrack, where);
}

/** `value` as the slideshow's own hand-over between songs; throws `InvalidOwnMusicError`. */
export function checkBetweenSongs(value: unknown, where: string): BetweenSongs {
  if (value !== SEQUENCE_BETWEEN_SONGS) {
    throw new InvalidOwnMusicError(
      where,
      "betweenSongs",
      JSON.stringify(SEQUENCE_BETWEEN_SONGS),
      value,
    );
  }
  return value;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
