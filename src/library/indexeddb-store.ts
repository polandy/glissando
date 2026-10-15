import { mediaOnlyIn, newestFirst, withClaimedMedia } from "./slideshow-queries";
import {
  MediaNotFoundError,
  SlideshowNotFoundError,
  type MediaClaim,
  type LibraryStore,
  type PictureBlobs,
  type StoredSlideshow,
} from "./stored-slideshow";
import {
  completed,
  requestResult,
  toBlob,
  toStoredMedia,
  type StoredMedia,
  type StoredPictureMedia,
} from "./indexeddb-records";
import {
  BEATS,
  FOCUS,
  IMPORTS,
  LIBRARY_DATABASE_NAME,
  MUSIC,
  PICTURES,
  SCHEMA_VERSION,
  SLIDESHOWS,
  VIDEOS,
  upgradeLibraryDatabase,
  type StoreName,
} from "./indexeddb-schema";
import { editSlideshowRecord } from "./indexeddb-edit";
import { CLEAN_UP_STORES, deleteUnreferenced, measureMediaBytes } from "./indexeddb-media";
import type { MusicBeats } from "../beats";
import type { PictureFocus } from "./picture-focus";

export { LIBRARY_DATABASE_NAME } from "./indexeddb-schema";

/** A `LibraryStore` over IndexedDB: slideshow records keyed by id, media blobs keyed by media id. */
export class IndexedDbLibraryStore implements LibraryStore {
  readonly #database: IDBDatabase;

  constructor(database: IDBDatabase) {
    this.#database = database;
    // Another tab upgrading the schema must not stay blocked behind this connection.
    database.onversionchange = () => database.close();
  }

  close(): void {
    this.#database.close();
  }

  async putPicture(id: string, blobs: PictureBlobs): Promise<void> {
    const record: StoredPictureMedia = {
      display: await toStoredMedia(blobs.display),
      thumbnail: await toStoredMedia(blobs.thumbnail),
    };
    return this.#write([PICTURES], (transaction) => {
      transaction.objectStore(PICTURES).put(record, id);
    });
  }

  async putMusic(id: string, blob: Blob): Promise<void> {
    const record = await toStoredMedia(blob);
    return this.#write([MUSIC], (transaction) => {
      transaction.objectStore(MUSIC).put(record, id);
    });
  }

  async putVideo(id: string, blob: Blob): Promise<void> {
    const record = await toStoredMedia(blob);
    return this.#write([VIDEOS], (transaction) => {
      transaction.objectStore(VIDEOS).put(record, id);
    });
  }

  saveSlideshow(slideshow: StoredSlideshow): Promise<void> {
    return this.#write([SLIDESHOWS], (transaction) => {
      transaction.objectStore(SLIDESHOWS).put(slideshow);
    });
  }

  async updateSlideshow(slideshow: StoredSlideshow): Promise<void> {
    await this.updateSlideshowWith(slideshow.id, () => slideshow);
  }

  updateSlideshowWith(
    id: string,
    edit: (current: StoredSlideshow) => StoredSlideshow,
  ): Promise<StoredSlideshow> {
    return editSlideshowRecord(this.#database, id, edit);
  }

  async listSlideshows(): Promise<readonly StoredSlideshow[]> {
    const all = await this.#read(SLIDESHOWS, (store) => store.getAll());
    return newestFirst(all as StoredSlideshow[]);
  }

  async getSlideshow(id: string): Promise<StoredSlideshow> {
    const slideshow = await this.#read(SLIDESHOWS, (store) => store.get(id));
    if (slideshow === undefined) {
      throw new SlideshowNotFoundError(id);
    }
    return slideshow as StoredSlideshow;
  }

  /** Reads the other records and deletes in one transaction, so a concurrent save cannot interleave. */
  deleteSlideshow(id: string): Promise<void> {
    let found = true;
    const deleted = this.#update(
      [SLIDESHOWS, PICTURES, MUSIC, VIDEOS, FOCUS, BEATS],
      (transaction) => {
        const slideshows = transaction.objectStore(SLIDESHOWS);
        const all = slideshows.getAll();
        all.onsuccess = () => {
          const records = all.result as StoredSlideshow[];
          const record = records.find((slideshow) => slideshow.id === id);
          if (record === undefined) {
            found = false;
            return;
          }
          slideshows.delete(id);
          const remaining = records.filter((slideshow) => slideshow.id !== id);
          for (const mediaId of mediaOnlyIn(record, remaining)) {
            for (const name of [PICTURES, FOCUS, MUSIC, VIDEOS, BEATS]) {
              transaction.objectStore(name).delete(mediaId);
            }
          }
          // The last request is placed: commit before a reload can abort the deletion.
          transaction.commit();
        };
      },
    );
    return deleted.then(() => {
      if (!found) {
        throw new SlideshowNotFoundError(id);
      }
    });
  }

  async pictureBlob(id: string): Promise<Blob> {
    return toBlob((await this.#picture(id)).display);
  }

  /** The display rendition: a picture on the device plays as it was stored. */
  async playbackPictureBlob(id: string): Promise<Blob> {
    return toBlob((await this.#picture(id)).display);
  }

  async thumbnailBlob(id: string): Promise<Blob> {
    return toBlob((await this.#picture(id)).thumbnail);
  }

  async musicBlob(id: string): Promise<Blob> {
    const media = await this.#read(MUSIC, (store) => store.get(id));
    if (media === undefined) {
      throw new MediaNotFoundError(id);
    }
    return toBlob(media as StoredMedia);
  }

  async videoBlob(id: string): Promise<Blob> {
    const media = await this.#read(VIDEOS, (store) => store.get(id));
    if (media === undefined) {
      throw new MediaNotFoundError(id);
    }
    return toBlob(media as StoredMedia);
  }

  /** Checks for the media and writes in one transaction, so a concurrent deletion cannot interleave. */
  putPictureFocus(pictureId: string, focus: PictureFocus): Promise<void> {
    return this.#update([PICTURES, FOCUS], (transaction) => {
      const media = transaction.objectStore(PICTURES).getKey(pictureId);
      media.onsuccess = () => {
        if (media.result !== undefined) {
          transaction.objectStore(FOCUS).put(focus, pictureId);
          transaction.commit();
        }
      };
    });
  }

  pictureFocus(pictureIds: readonly string[]): Promise<ReadonlyMap<string, PictureFocus>> {
    const transaction = this.#database.transaction(FOCUS, "readonly");
    const store = transaction.objectStore(FOCUS);
    const found = new Map<string, PictureFocus>();
    for (const id of pictureIds) {
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result !== undefined) {
          found.set(id, request.result as PictureFocus);
        }
      };
    }
    return completed(transaction, () => found, "reading the pictures' focus");
  }

  /** Checks for the media and writes in one transaction, so a concurrent deletion cannot interleave. */
  putMusicBeats(musicId: string, beats: MusicBeats): Promise<void> {
    return this.#update([MUSIC, BEATS], (transaction) => {
      const media = transaction.objectStore(MUSIC).getKey(musicId);
      media.onsuccess = () => {
        if (media.result !== undefined) {
          transaction.objectStore(BEATS).put(beats, musicId);
          transaction.commit();
        }
      };
    });
  }

  async musicBeats(musicId: string): Promise<MusicBeats | undefined> {
    return (await this.#read(BEATS, (store) => store.get(musicId))) as MusicBeats | undefined;
  }

  /** One read-only transaction; each record is dropped once measured, so memory stays bounded. */
  mediaBytes(slideshow: StoredSlideshow): Promise<number> {
    const transaction = this.#database.transaction([PICTURES, MUSIC, VIDEOS], "readonly");
    const bytes = measureMediaBytes(transaction, slideshow);
    return completed(transaction, () => bytes.total, "measuring the media");
  }

  claimMedia(claimId: string, startedAt: Date, mediaId: string): Promise<void> {
    return this.#update([IMPORTS], (transaction) => {
      const imports = transaction.objectStore(IMPORTS);
      const existing = imports.get(claimId);
      existing.onsuccess = () => {
        const record = existing.result as MediaClaim | undefined;
        imports.put(withClaimedMedia(record, claimId, startedAt, mediaId));
      };
    });
  }

  releaseClaim(claimId: string): Promise<void> {
    return this.#write([IMPORTS], (transaction) => {
      transaction.objectStore(IMPORTS).delete(claimId);
    });
  }

  /**
   * Reads the references and imports and deletes in one transaction, so a concurrent save or
   * claim cannot interleave.
   */
  deleteUnreferencedMedia(now: Date): Promise<void> {
    return this.#update(CLEAN_UP_STORES, (transaction) => deleteUnreferenced(transaction, now));
  }

  async #picture(id: string): Promise<StoredPictureMedia> {
    const media = await this.#read(PICTURES, (store) => store.get(id));
    if (media === undefined) {
      throw new MediaNotFoundError(id);
    }
    return media as StoredPictureMedia;
  }

  #read(name: StoreName, query: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
    const request = query(this.#database.transaction(name, "readonly").objectStore(name));
    return requestResult(request);
  }

  /**
   * Writes that need no read, committed at once: Chromium aborts a transaction still open when
   * the page unloads, so a reload right after an edit would otherwise lose it.
   */
  #write(names: StoreName[], work: (transaction: IDBTransaction) => void): Promise<void> {
    return this.#transact(names, (transaction) => {
      work(transaction);
      transaction.commit();
    });
  }

  /** Writes that read first; the transaction commits once its last request callback has run. */
  #update(names: StoreName[], work: (transaction: IDBTransaction) => void): Promise<void> {
    return this.#transact(names, work);
  }

  /** Resolves once the transaction has committed; rejects with its error (e.g. QuotaExceededError). */
  #transact(names: StoreName[], work: (transaction: IDBTransaction) => void): Promise<void> {
    const transaction = this.#database.transaction(names, "readwrite");
    const committed = completed(transaction, () => undefined, `the write to ${names.join(", ")}`);
    work(transaction);
    return committed;
  }
}

/** Opens (and creates or upgrades) the library database. */
export function openLibraryStore(indexedDB: IDBFactory): Promise<IndexedDbLibraryStore> {
  const request = indexedDB.open(LIBRARY_DATABASE_NAME, SCHEMA_VERSION);
  request.onupgradeneeded = (event) => upgradeLibraryDatabase(request.result, event.oldVersion);
  return requestResult(request).then(() => new IndexedDbLibraryStore(request.result));
}
