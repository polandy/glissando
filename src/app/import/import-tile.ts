import type { StoredPicture } from "../../library/stored-slideshow";
import type { PictureTile } from "../screens/view-models";

/**
 * A stored picture as the reused picture strip can show it while importing
 * (IMPORT_ARRANGING.md, Arranging): always alone, with no motion, own duration, own transition or
 * pairing of its own, since those belong to the picture editor the pictures step never opens.
 */
export function importPictureTile(picture: StoredPicture, thumbnailUrl: string): PictureTile {
  return {
    id: picture.id,
    thumbnailUrl,
    capturedAt: picture.capturedAt,
    ...(picture.video === undefined ? {} : { clipMs: picture.video.endMs - picture.video.startMs }),
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: picture.alone === true,
    colours: picture.colours,
  };
}
