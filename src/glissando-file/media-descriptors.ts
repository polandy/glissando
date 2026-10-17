import { matchesMediaKind, type MediaKind } from "./entry-names";
import { typeOfPicturePath, type GlissandoManifest } from "./glissando-manifest";

/** What the manifest says a media file at a path is: its kind, its MIME type and, for a display
 * picture, the pixel size the manifest declares (checked against the file's own header). */
export interface MediaDescriptor {
  readonly kind: MediaKind;
  readonly mimeType: string;
  readonly size?: { readonly width: number; readonly height: number };
}

export type MediaDescriptors =
  | { readonly kind: "ok"; readonly byPath: ReadonlyMap<string, MediaDescriptor> }
  | { readonly kind: "damaged"; readonly reason: string };

/**
 * Every media path the manifest names, each checked against its kind's entry name pattern
 * (ADR-0038): a picture named as a thumbnail, or a path outside any kind's pattern, is damaged.
 */
export function mediaDescriptors(manifest: GlissandoManifest): MediaDescriptors {
  const byPath = new Map<string, MediaDescriptor>();
  const add = (path: string, descriptor: MediaDescriptor): string | null => {
    if (!matchesMediaKind(descriptor.kind, path)) {
      return `"${path}" is not a valid ${descriptor.kind} entry name`;
    }
    byPath.set(path, descriptor);
    return null;
  };

  for (const picture of manifest.slideshow.pictures) {
    const displayType = typeOfPicturePath(picture.file);
    if (displayType === null) {
      return damaged(`"${picture.file}" is of an unknown picture type`);
    }
    const displayError = add(picture.file, {
      kind: "picture",
      mimeType: displayType,
      size: { width: picture.width, height: picture.height },
    });
    if (displayError !== null) {
      return damaged(displayError);
    }

    const thumbnailType = typeOfPicturePath(picture.thumbnail);
    if (thumbnailType === null) {
      return damaged(`"${picture.thumbnail}" is of an unknown picture type`);
    }
    const thumbnailError = add(picture.thumbnail, { kind: "thumbnail", mimeType: thumbnailType });
    if (thumbnailError !== null) {
      return damaged(thumbnailError);
    }

    if (picture.video !== undefined) {
      const videoError = add(picture.video.file, {
        kind: "video",
        mimeType: picture.video.mimeType,
      });
      if (videoError !== null) {
        return damaged(videoError);
      }
    }
  }
  for (const song of manifest.slideshow.songs) {
    const songError = add(song.file, { kind: "music", mimeType: song.mimeType });
    if (songError !== null) {
      return damaged(songError);
    }
  }
  return { kind: "ok", byPath };
}

function damaged(reason: string): MediaDescriptors {
  return { kind: "damaged", reason };
}
