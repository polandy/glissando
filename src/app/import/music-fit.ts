import { picturesFillMs, slideDurationsMs, type TimedPicture } from "../../compose";
import type { StoredPicture } from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../../player";

/** The chosen music of a slideshow about to be created, and whether its pictures fill it. */
export interface ImportMusic {
  readonly durationMs: number;
  readonly filled: boolean;
}

/**
 * How the music meets the slideshow (ADR-0047): it ends with it, fades out at its end, shrinks
 * the automatic pictures to fit a shorter one ("fitted"), or outlasts it with the music either
 * repeating to cover the rest ("repeats") or not yet ("silent-after").
 */
export type ImportMusicFit = "ends-with" | "fades-out" | "fitted" | "repeats" | "silent-after";

/**
 * `shareSeconds`, the shrunk automatic pictures' mean length, is only present for `"fitted"`
 * (mirrors `music-timing-note.ts`'s `TimingNote`).
 */
export type ImportMusicTiming =
  | { readonly kind: Exclude<ImportMusicFit, "fitted">; readonly seconds: number }
  | { readonly kind: "fitted"; readonly seconds: number; readonly shareSeconds: number };

export interface ImportTiming {
  readonly perPictureSeconds: number;
  readonly totalSeconds: number;
  /** The music's length and how it meets the slideshow; null without music. */
  readonly music: ImportMusicTiming | null;
}

/** A video lasts its excerpt; a photo has no own duration yet (`undefined`). */
export function ownDurationsMs(
  pictures: readonly Pick<StoredPicture, "video">[],
): (number | undefined)[] {
  return pictures.map(({ video }) =>
    video === undefined ? undefined : video.endMs - video.startMs,
  );
}

function timedPictures(ownMs: readonly (number | undefined)[]): TimedPicture[] {
  return ownMs.map((durationMs) => (durationMs === undefined ? {} : { durationMs }));
}

/**
 * The length the automatic pictures fill or fit (`picturesFillMs`), and whether that is a shrink
 * from their own or mood seconds rather than plain "Fill the music" (ADR-0047's "fitted").
 */
function fillResolution(
  pictures: readonly TimedPicture[],
  music: ImportMusic,
  secondsPerPicture: number,
  repeatMusic: true | undefined,
): { readonly filledMs: number | undefined; readonly fitted: boolean } {
  const target = music.filled ? undefined : secondsPerPicture;
  const filledMs = picturesFillMs(music.durationMs, pictures, target, repeatMusic);
  return { filledMs, fitted: !music.filled && filledMs !== undefined };
}

/**
 * The slide durations of a slideshow about to be created, from each picture's own duration; the
 * music's beats are not known yet.
 */
export function importSlideDurationsMs(
  ownMs: readonly (number | undefined)[],
  music: ImportMusic | undefined,
  secondsPerPicture: number,
  repeatMusic: true | undefined,
): number[] {
  const pictures = timedPictures(ownMs);
  const filledMs =
    music === undefined
      ? undefined
      : fillResolution(pictures, music, secondsPerPicture, repeatMusic).filledMs;
  return slideDurationsMs(pictures, filledMs, secondsPerPicture);
}

/** Step 2's timing row, by the same rule the slideshow is composed with. */
export function importTiming(
  ownMs: readonly (number | undefined)[],
  music: ImportMusic | undefined,
  secondsPerPicture: number,
  repeatMusic: true | undefined,
): ImportTiming {
  const pictures = timedPictures(ownMs);
  const resolution =
    music === undefined
      ? undefined
      : fillResolution(pictures, music, secondsPerPicture, repeatMusic);
  const durationsMs = slideDurationsMs(pictures, resolution?.filledMs, secondsPerPicture);
  const totalMs = durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
  return {
    perPictureSeconds: totalMs / ownMs.length / MILLISECONDS_PER_SECOND,
    totalSeconds: totalMs / MILLISECONDS_PER_SECOND,
    music:
      music === undefined || resolution === undefined
        ? null
        : musicTiming(music, totalMs, resolution, pictures, durationsMs, repeatMusic),
  };
}

function musicTiming(
  music: ImportMusic,
  totalMs: number,
  resolution: { readonly filledMs: number | undefined; readonly fitted: boolean },
  pictures: readonly TimedPicture[],
  durationsMs: readonly number[],
  repeatMusic: true | undefined,
): ImportMusicTiming {
  const seconds = music.durationMs / MILLISECONDS_PER_SECOND;
  if (resolution.fitted) {
    return {
      kind: "fitted",
      seconds,
      shareSeconds: automaticShareMs(pictures, durationsMs) / MILLISECONDS_PER_SECOND,
    };
  }
  return { kind: musicFit(totalMs, music.durationMs, repeatMusic), seconds };
}

function musicFit(
  slideshowMs: number,
  musicMs: number,
  repeatMusic: true | undefined,
): Exclude<ImportMusicFit, "fitted"> {
  if (slideshowMs > musicMs) {
    return repeatMusic === true ? "repeats" : "silent-after";
  }
  return slideshowMs < musicMs ? "fades-out" : "ends-with";
}

/** The automatic pictures' mean length, the smallest share rounded down. */
function automaticShareMs(
  pictures: readonly TimedPicture[],
  durationsMs: readonly number[],
): number {
  const automaticMs = durationsMs.filter((_, index) => pictures[index]?.durationMs === undefined);
  return automaticMs.length === 0
    ? 0
    : Math.floor(automaticMs.reduce((sum, ms) => sum + ms, 0) / automaticMs.length);
}
