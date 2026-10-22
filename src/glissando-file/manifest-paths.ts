/**
 * Where a .glissando file's media sit inside the container: one path per picture, thumbnail and
 * song, worked out from its index and (for a picture) its MIME type.
 */

const PICTURE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** The extensions a picture or thumbnail entry may have, shared with the entry name allowlist. */
export const PICTURE_FILE_EXTENSIONS: readonly string[] = Object.values(PICTURE_EXTENSIONS);
export const PICTURE_NUMBER_DIGITS = 4;
const MUSIC_EXTENSION = /\.([a-z0-9]{1,8})$/i;

/** A picture's two renditions' MIME types. */
export interface PictureTypes {
  readonly display: string;
  readonly thumbnail: string;
}

/** Where picture `index` (from 0) and its thumbnail sit in the container. */
export function picturePaths(
  index: number,
  types: PictureTypes,
): { readonly file: string; readonly thumbnail: string } {
  const number = String(index + 1).padStart(PICTURE_NUMBER_DIGITS, "0");
  return {
    file: `pictures/${number}.${pictureExtension(types.display)}`,
    thumbnail: thumbnailPath(index, types.thumbnail),
  };
}

/** Where thumbnail `index` (from 0) of type `type` sits in the container. */
export function thumbnailPath(index: number, type: string): string {
  const number = String(index + 1).padStart(PICTURE_NUMBER_DIGITS, "0");
  return `thumbnails/${number}.${pictureExtension(type)}`;
}

/**
 * Where song `index` (from 0) of the playlist sits in the container: its own path, keeping its
 * file's extension so an unzipped file opens in any player.
 */
export function songPath(index: number, fileName: string): string {
  const base = `music/track-${index + 1}`;
  const extension = MUSIC_EXTENSION.exec(fileName)?.[1];
  return extension === undefined ? base : `${base}.${extension.toLowerCase()}`;
}

/** A picture's MIME type from its path's extension; null for one the format does not use. */
export function typeOfPicturePath(path: string): string | null {
  const extension = path.slice(path.lastIndexOf(".") + 1);
  const found = Object.entries(PICTURE_EXTENSIONS).find(([, known]) => known === extension);
  return found?.[0] ?? null;
}

/** `pictureTypes[index]`; throws if the caller passed fewer entries than pictures. */
export function typesAt(pictureTypes: readonly PictureTypes[], index: number): PictureTypes {
  const types = pictureTypes[index];
  if (types === undefined) {
    throw new Error(`picture ${index} has no types: pass one entry per picture`);
  }
  return types;
}

function pictureExtension(type: string): string {
  const extension = PICTURE_EXTENSIONS[type];
  if (extension === undefined) {
    throw new Error(
      `a picture of type "${type}" cannot go into a .glissando file: expected one of ${Object.keys(PICTURE_EXTENSIONS).join(", ")}`,
    );
  }
  return extension;
}
