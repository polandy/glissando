import { MAX_VIDEO_EXCERPT_MS, MIN_VIDEO_EXCERPT_MS } from "../player/slideshow";

export { MAX_VIDEO_EXCERPT_MS, MIN_VIDEO_EXCERPT_MS };

/**
 * The clip a video slide plays (ADR-0034, `dev-docs/player/VIDEO_SLIDES.md`); the picture holding
 * it is the poster. All times are whole ms of the clip.
 */
export interface StoredVideo {
  /** The original file in the `videos` object store. */
  readonly mediaId: string;
  /** The whole clip's length. */
  readonly sourceMs: number;
  readonly startMs: number;
  readonly endMs: number;
  /** 0 to 100 in steps of 5 (`checkVideoVolume`); absent: `DEFAULT_VIDEO_VOLUME`; 0: sound off. */
  readonly volume?: number;
  /** `false` lets the music keep its volume; absent: it ducks while the clip has sound. */
  readonly duckMusic?: false;
}

/** A source file over this is refused at import. */
export const MAX_VIDEO_BYTES = 1024 ** 3;

export const MAX_VIDEO_VOLUME = 100;
export const DEFAULT_VIDEO_VOLUME = MAX_VIDEO_VOLUME;
export const VIDEO_VOLUME_STEP = 5;

export class InvalidVideoError extends Error {
  constructor(
    where: string,
    /** The bad field of the video: `startMs`, `endMs` or `volume`. */
    readonly field: string,
    readonly expected: string,
    readonly actual: unknown,
  ) {
    super(`${where} ${field}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "InvalidVideoError";
  }
}

/** The excerpt of a clip `sourceMs` long; throws `InvalidVideoError` naming `where` and the field. */
export function checkVideoExcerpt(
  excerpt: Pick<StoredVideo, "sourceMs" | "startMs" | "endMs">,
  where: string,
): Pick<StoredVideo, "startMs" | "endMs"> {
  const { sourceMs, startMs, endMs } = excerpt;
  if (!Number.isInteger(startMs) || startMs < 0) {
    throw new InvalidVideoError(where, "startMs", "a whole number of ms ≥ 0", startMs);
  }
  if (!Number.isInteger(endMs)) {
    throw new InvalidVideoError(where, "endMs", "a whole number of ms", endMs);
  }
  const lastMs = Math.min(sourceMs, startMs + MAX_VIDEO_EXCERPT_MS);
  if (endMs < startMs + MIN_VIDEO_EXCERPT_MS || endMs > lastMs) {
    throw new InvalidVideoError(
      where,
      "endMs",
      `from ${startMs + MIN_VIDEO_EXCERPT_MS} to ${lastMs} (an excerpt of ${MIN_VIDEO_EXCERPT_MS} to ${MAX_VIDEO_EXCERPT_MS} ms within the ${sourceMs} ms clip)`,
      endMs,
    );
  }
  return { startMs, endMs };
}

/** `value` as a clip's volume; throws `InvalidVideoError` naming `where`. */
export function checkVideoVolume(value: unknown, where: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_VIDEO_VOLUME ||
    value % VIDEO_VOLUME_STEP !== 0
  ) {
    throw new InvalidVideoError(
      where,
      "volume",
      `0 to ${MAX_VIDEO_VOLUME} in steps of ${VIDEO_VOLUME_STEP}`,
      value,
    );
  }
  return value;
}
