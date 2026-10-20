import { claimsAt, referencedMediaIds } from "./slideshow-queries";
import type { MediaClaim, StoredSlideshow } from "./stored-slideshow";
import type { StoredMedia, StoredPictureMedia } from "./indexeddb-records";
import {
  BEATS,
  FOCUS,
  IMPORTS,
  LOUDNESS,
  MUSIC,
  PICTURES,
  SLIDESHOWS,
  VIDEOS,
  type StoreName,
} from "./indexeddb-schema";

/** The stores `deleteUnreferenced` reads and writes in its one transaction. */
export const CLEAN_UP_STORES: StoreName[] = [
  SLIDESHOWS,
  PICTURES,
  MUSIC,
  VIDEOS,
  IMPORTS,
  FOCUS,
  BEATS,
  LOUDNESS,
];

/**
 * Adds up the stored bytes of a slideshow's media inside `transaction` (over `PICTURES`,
 * `MUSIC` and `VIDEOS`); `total` is complete once the transaction is.
 */
export function measureMediaBytes(
  transaction: IDBTransaction,
  slideshow: StoredSlideshow,
): { total: number } {
  const bytes = { total: 0 };
  const measure = (name: StoreName, id: string, size: (media: unknown) => number): void => {
    const request = transaction.objectStore(name).get(id);
    request.onsuccess = () => {
      bytes.total += request.result === undefined ? 0 : size(request.result);
    };
  };
  for (const picture of slideshow.pictures) {
    if (picture.video !== undefined) {
      measure(VIDEOS, picture.video.mediaId, (media) => (media as StoredMedia).bytes.byteLength);
    }
    measure(PICTURES, picture.id, (media) => {
      const { display, thumbnail } = media as StoredPictureMedia;
      return display.bytes.byteLength + thumbnail.bytes.byteLength;
    });
  }
  for (const song of slideshow.songs) {
    measure(MUSIC, song.id, (media) => (media as StoredMedia).bytes.byteLength);
  }
  return bytes;
}

/**
 * Deletes, inside `transaction` (over `CLEAN_UP_STORES`), the media no slideshow references and
 * no live claim spares, and the stale claims.
 */
export function deleteUnreferenced(transaction: IDBTransaction, now: Date): void {
  const slideshows = transaction.objectStore(SLIDESHOWS).getAll();
  const importStore = transaction.objectStore(IMPORTS);
  const imports = importStore.getAll();
  imports.onsuccess = () => {
    const referenced = referencedMediaIds(slideshows.result as StoredSlideshow[]);
    const { sparedMediaIds, staleClaimIds } = claimsAt(imports.result as MediaClaim[], now);
    staleClaimIds.forEach((id) => importStore.delete(id));
    // Focus, beats and loudness are media too: one kept for media that went goes with it.
    for (const name of [PICTURES, MUSIC, VIDEOS, FOCUS, BEATS, LOUDNESS]) {
      const media = transaction.objectStore(name);
      const keys = media.getAllKeys();
      keys.onsuccess = () => {
        for (const key of keys.result) {
          if (typeof key === "string" && !referenced.has(key) && !sparedMediaIds.has(key)) {
            media.delete(key);
          }
        }
      };
    }
  };
}
