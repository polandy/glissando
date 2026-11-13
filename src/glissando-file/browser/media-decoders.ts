import {
  assertMusicWithinLimits,
  MAX_MUSIC_DURATION_MS,
  MusicOverLimitError,
} from "../../import/music-limits";
import { probeMusicDurationMs, UnreadableMusicError } from "../../import/music-probe";
import { MILLISECONDS_PER_SECOND } from "../../player/slideshow";
import { openClipInVideoElement } from "../../import/browser/video-clip";
import { encodeThumbnail } from "../../import/downscale";
import type { MediaDecoders } from "../media-decoders";

/** Any rate proves a song decodes; a low one keeps the decoded copy small. */
const DECODE_PROBE_SAMPLE_RATE = 8000;

/** The name given a clip's blob to open it in a `<video>` element; never shown to anyone. */
const CLIP_PLACEHOLDER_NAME = "clip";

/**
 * Decodes a .glissando file's media with the browser's own codecs (ADR-0038). A picture decodes
 * on the main thread: WebKit's worker cannot read a `file://` blob, which is where an opened
 * .glissando file's media sit. `log` takes a clip's length-reading error (`openClipInVideoElement`).
 */
export function browserMediaDecoders(log: (error: unknown) => void): MediaDecoders {
  return {
    // Each medium is read before the decode's try, so a read failure stays an error and is not
    // taken for a damaged file.
    async picture(picture) {
      const bytes = new Blob([await picture.arrayBuffer()]);
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(bytes);
      } catch {
        return null;
      }
      const { width, height } = bitmap;
      bitmap.close();
      return { width, height };
    },

    // A song over a limit is undecodable and never decoded. The audio element reads the length
    // from the song's headers; where it cannot (WebKit, a constant-bitrate MP3 without a
    // Xing/Info header) the decode measures the song, bounded by `MAX_MUSIC_BYTES` alone.
    async music(song) {
      const bytes = await song.arrayBuffer();
      try {
        await assertMusicWithinLimits(new Blob([bytes]), probeMusicDurationMs);
      } catch (error) {
        if (error instanceof MusicOverLimitError) {
          return false;
        }
        if (!(error instanceof UnreadableMusicError)) {
          throw error;
        }
      }
      const context = new OfflineAudioContext(1, 1, DECODE_PROBE_SAMPLE_RATE);
      let decoded: AudioBuffer;
      try {
        decoded = await context.decodeAudioData(bytes);
      } catch {
        return false;
      }
      return decoded.duration * MILLISECONDS_PER_SECOND <= MAX_MUSIC_DURATION_MS;
    },

    async clip(clip) {
      const file = new File([clip], CLIP_PLACEHOLDER_NAME);
      const opened = await openClipInVideoElement(file, log);
      if (opened === null) {
        return false;
      }
      opened.close();
      return true;
    },

    // Called only for a picture that decoded, so a failure here is an error, not a damaged file.
    async thumbnail(picture) {
      const bitmap = await createImageBitmap(new Blob([await picture.arrayBuffer()]));
      try {
        return await encodeThumbnail(bitmap);
      } finally {
        bitmap.close();
      }
    },
  };
}
