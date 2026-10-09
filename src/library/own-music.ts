import { MILLISECONDS_PER_SECOND } from "../player/slideshow";

/**
 * The music's own excerpt and fades, set in the music editor. Absent fields mean the whole track
 * and automatic fades; the music file itself is never changed. See ADR-0009.
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

/** The music's fields this module checks. */
export type OwnMusicField = "trim" | "fadeInMs" | "fadeOutMs";

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
    !isWholeMs(startMs) ||
    !isWholeMs(endMs) ||
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
  field: Exclude<OwnMusicField, "trim">,
  where: string,
): number {
  if (
    !isWholeMs(value) ||
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

function isWholeMs(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
