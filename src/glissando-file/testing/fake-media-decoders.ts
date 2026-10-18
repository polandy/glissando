import { readPictureHeader } from "../picture-header";
import type { MediaDecoders } from "../media-decoders";

export interface FakeMediaDecodersOptions {
  /** A picture whose bytes contain this text fails to decode, even with a readable header. */
  readonly refusePictureContaining?: string;
  /** A song whose bytes contain this text fails to decode. */
  readonly refuseMusicContaining?: string;
  /** A clip whose bytes contain this text fails to load. */
  readonly refuseClipContaining?: string;
}

/** What a made thumbnail starts with, followed by the picture it was made from. */
export const MADE_THUMBNAIL_MARKER = "thumbnail made from: ";

/** A hand-written fake: by default a picture "decodes" to its own header size, a song or clip
 * always decodes, a thumbnail is the marker and its picture. Each call is logged, so a test can
 * prove a decoder was never reached. */
export interface FakeMediaDecoders extends MediaDecoders {
  readonly pictureCalls: readonly Blob[];
  readonly musicCalls: readonly Blob[];
  readonly clipCalls: readonly Blob[];
  readonly thumbnailCalls: readonly Blob[];
}

export function fakeMediaDecoders(options: FakeMediaDecodersOptions = {}): FakeMediaDecoders {
  const pictureCalls: Blob[] = [];
  const musicCalls: Blob[] = [];
  const clipCalls: Blob[] = [];
  const thumbnailCalls: Blob[] = [];
  return {
    pictureCalls,
    musicCalls,
    clipCalls,
    thumbnailCalls,

    async picture(picture) {
      pictureCalls.push(picture);
      if (await refuses(picture, options.refusePictureContaining)) {
        return null;
      }
      return readPictureHeader(picture);
    },

    async music(song) {
      musicCalls.push(song);
      return !(await refuses(song, options.refuseMusicContaining));
    },

    async clip(clip) {
      clipCalls.push(clip);
      return !(await refuses(clip, options.refuseClipContaining));
    },

    thumbnail(picture) {
      thumbnailCalls.push(picture);
      return Promise.resolve(new Blob([MADE_THUMBNAIL_MARKER, picture], { type: "image/jpeg" }));
    },
  };
}

async function refuses(blob: Blob, marker: string | undefined): Promise<boolean> {
  return marker !== undefined && (await blob.text()).includes(marker);
}
