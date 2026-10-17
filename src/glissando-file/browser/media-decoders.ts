import { DETECTION_SAMPLE_RATE } from "../../beats/decode-music";
import { openClipInVideoElement } from "../../import/browser/video-clip";
import type { MediaDecoders } from "../media-decoders";

/** The name given a clip's blob to open it in a `<video>` element; never shown to anyone. */
const CLIP_PLACEHOLDER_NAME = "clip";

/**
 * Decodes a .glissando file's media with the browser's own codecs (ADR-0038). A picture decodes
 * on the main thread: WebKit's worker cannot read a `file://` blob, which is where an opened
 * .glissando file's media sit.
 */
export function browserMediaDecoders(): MediaDecoders {
  return {
    async picture(picture) {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(picture);
      } catch {
        return null;
      }
      const { width, height } = bitmap;
      bitmap.close();
      return { width, height };
    },

    async music(song) {
      const context = new OfflineAudioContext(1, 1, DETECTION_SAMPLE_RATE);
      try {
        await context.decodeAudioData(await song.arrayBuffer());
        return true;
      } catch {
        return false;
      }
    },

    async clip(clip) {
      const file = new File([clip], CLIP_PLACEHOLDER_NAME);
      const opened = await openClipInVideoElement(file);
      if (opened === null) {
        return false;
      }
      opened.close();
      return true;
    },
  };
}
