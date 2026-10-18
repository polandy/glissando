import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { ownMusicFields, type ManifestSlideshow } from "./glissando-manifest";
import { cardFromManifest } from "./manifest-card";
import { storedVideo } from "./manifest-video";

/**
 * The ids the mapped slideshow's pictures, songs and clips get: one array entry per picture and
 * per song, in the manifest's play order, and the stored id each clip's container path gets.
 */
export interface ManifestMediaIds {
  readonly pictureIds: readonly string[];
  readonly songIds: readonly string[];
  readonly clipIds: ReadonlyMap<string, string>;
}

/** `slideshow` mapped to a `StoredSlideshow`, apart from its identity (`id`, `title`, `createdAt`),
 * which differ between a file written to the library (fresh ids, a de-duplicated title) and a
 * file played from `index.html` (the entry paths themselves as ids, the manifest's own title). */
export type MappedSlideshow = Omit<StoredSlideshow, "id" | "title" | "createdAt">;

/**
 * Maps a manifest's `slideshow` to the device-shaped record `StoredSlideshow` holds, given the
 * ids its pictures, songs and clips get. Used both when a `.glissando` file is stored in the
 * library (`writeGlissandoFile`) and when `index.html` plays it straight from the unpacked folder.
 */
export function slideshowFromManifest(
  slideshow: ManifestSlideshow,
  ids: ManifestMediaIds,
): MappedSlideshow {
  const pictures = slideshow.pictures.map((picture, index): StoredPicture => {
    const id = ids.pictureIds[index];
    if (id === undefined) {
      throw new Error(`picture ${index} has no id: pass one id per picture`);
    }
    return {
      id,
      capturedAt: picture.capturedAt,
      width: picture.width,
      height: picture.height,
      fileName: picture.fileName,
      colours: picture.colours,
      ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
      ...(picture.caption === undefined ? {} : { caption: picture.caption }),
      ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
      ...(picture.transition === undefined ? {} : { transition: picture.transition }),
      ...(picture.immichAssetId === undefined ? {} : { immichAssetId: picture.immichAssetId }),
      ...(picture.fileBytes === undefined ? {} : { fileBytes: picture.fileBytes }),
      ...(picture.alone === true ? { alone: true } : {}),
      ...(picture.video === undefined ? {} : { video: storedVideo(picture.video, ids.clipIds) }),
    };
  });
  const songs = slideshow.songs.map((song, index): StoredMusic => {
    const id = ids.songIds[index];
    if (id === undefined) {
      throw new Error(`song ${index} has no id: pass one id per song`);
    }
    return {
      id,
      fileName: song.fileName,
      durationMs: song.durationMs,
      mimeType: song.mimeType,
      ...ownMusicFields(song),
    };
  });
  const pictureIds = pictures.map((picture) => picture.id);
  const openingCard = cardFromManifest(slideshow.openingCard, pictureIds);
  const closingCard = cardFromManifest(slideshow.closingCard, pictureIds);
  return {
    pictures,
    ...(slideshow.ownOrder ? { ownOrder: true } : {}),
    ...(slideshow.pictureLength === undefined ? {} : { pictureLength: slideshow.pictureLength }),
    ...(slideshow.portraitPictures === undefined
      ? {}
      : { portraitPictures: slideshow.portraitPictures }),
    ...(slideshow.transition === undefined ? {} : { transition: slideshow.transition }),
    songs,
    ...(slideshow.betweenSongs === undefined ? {} : { betweenSongs: slideshow.betweenSongs }),
    secondsPerPicture: slideshow.secondsPerPicture,
    ...(openingCard === undefined ? {} : { openingCard }),
    ...(closingCard === undefined ? {} : { closingCard }),
  };
}
