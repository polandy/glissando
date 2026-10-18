import { thumbnailPath, type ManifestPicture } from "./glissando-manifest";
import { MADE_THUMBNAIL_TYPE } from "./media-decoders";

/** A picture as read, whose manifest may name no thumbnail (ADR-0038). */
export type PictureAsRead = Omit<ManifestPicture, "thumbnail"> & { readonly thumbnail?: string };

/**
 * Each picture with a thumbnail path: its own, or, for one whose manifest names none, a path of
 * the format for the thumbnail made from it — the first from the picture's own number on that
 * neither an entry of the container nor another picture uses, so it never picks up foreign bytes.
 */
export function withThumbnailPaths(
  pictures: readonly PictureAsRead[],
  entryNames: ReadonlySet<string>,
): ManifestPicture[] {
  const taken = new Set(entryNames);
  for (const { thumbnail } of pictures) {
    if (thumbnail !== undefined) {
      taken.add(thumbnail);
    }
  }
  return pictures.map((picture, index) => {
    if (picture.thumbnail !== undefined) {
      return { ...picture, thumbnail: picture.thumbnail };
    }
    let number = index;
    while (taken.has(thumbnailPath(number, MADE_THUMBNAIL_TYPE))) {
      number += 1;
    }
    const thumbnail = thumbnailPath(number, MADE_THUMBNAIL_TYPE);
    taken.add(thumbnail);
    return { ...picture, thumbnail };
  });
}
