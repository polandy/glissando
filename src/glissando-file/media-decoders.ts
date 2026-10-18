/** The type of every thumbnail `MediaDecoders.thumbnail` makes. */
export const MADE_THUMBNAIL_TYPE = "image/jpeg";

/**
 * Decodes a .glissando file's media before it is stored (ADR-0038): a file that is not what its
 * name and manifest say is refused, not only checksummed. The browser adapter is
 * `./browser/media-decoders.ts`; tests use the hand-written fake in `./testing/`.
 */
export interface MediaDecoders {
  /** A picture's decoded pixel size; null when it does not decode. */
  picture(picture: Blob): Promise<{ readonly width: number; readonly height: number } | null>;
  /** Whether a song decodes. */
  music(song: Blob): Promise<boolean>;
  /** Whether this browser loads a clip's metadata. */
  clip(clip: Blob): Promise<boolean>;
  /** A thumbnail of `MADE_THUMBNAIL_TYPE` made from a picture that decoded, for a file without its own. */
  thumbnail(picture: Blob): Promise<Blob>;
}
