import { MILLISECONDS_PER_SECOND } from "../player/slideshow";

const MIB = 1024 * 1024;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_LIMIT = 20;

/** The most a song may weigh: what the server accepts as an upload (MUSIC.md, "Limits"). */
export const MAX_MUSIC_BYTES = 200 * MIB;

/**
 * The longest a song may play: bounds the full-rate decode, about 23 MB of Float32 per stereo
 * minute at 48 kHz, so 460 MB at worst (MUSIC.md, "Limits").
 */
export const MAX_MUSIC_DURATION_MS =
  MINUTES_PER_LIMIT * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

/** The megabytes `MAX_MUSIC_BYTES` is, for the message that names the limit. */
export const MAX_MUSIC_MEGABYTES = MAX_MUSIC_BYTES / MIB;

/** The minutes `MAX_MUSIC_DURATION_MS` is, for the message that names the limit. */
export const MAX_MUSIC_MINUTES = MINUTES_PER_LIMIT;

/** Which limit a song is over. */
export type MusicLimit = "tooLarge" | "tooLong";

export class MusicOverLimitError extends Error {
  constructor(readonly limit: MusicLimit) {
    super(
      limit === "tooLarge"
        ? "the song is over the byte limit"
        : "the song is over the duration limit",
    );
    this.name = "MusicOverLimitError";
  }
}

/**
 * Rejects with `MusicOverLimitError` for a song over a limit, so the decoders never read it. The
 * bytes are checked first: a file over the byte cap is not opened to learn its length.
 */
export async function assertMusicWithinLimits(
  music: Blob,
  probeDurationMs: (music: Blob) => Promise<number>,
): Promise<void> {
  if (music.size > MAX_MUSIC_BYTES) throw new MusicOverLimitError("tooLarge");
  if ((await probeDurationMs(music)) > MAX_MUSIC_DURATION_MS)
    throw new MusicOverLimitError("tooLong");
}
