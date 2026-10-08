import {
  claimsAt,
  mediaOnlyIn,
  newestFirst,
  referencedMediaIds,
  withClaimedMedia,
} from "./slideshow-queries";
import {
  MediaNotFoundError,
  SlideshowNotFoundError,
  type MediaClaim,
  type LibraryStore,
  type PictureBlobs,
  type StoredSlideshow,
} from "./stored-slideshow";
import {
  requestResult,
  toBlob,
  toStoredMedia,
  type StoredMedia,
  type StoredPictureMedia,
} from "./indexeddb-records";

/** Records and media share one database so a transaction can span both (see ADR-0003). */
export const LIBRARY_DATABASE_NAME = "glissando";
const SCHEMA_VERSION = 2;
/** The version that added the `imports` store. */
const IMPORTS_ADDED_IN = 2;

const SLIDESHOWS = "slideshows";
const PICTURES = "pictures";
const MUSIC = "music";
const IMPORTS = "imports";
type StoreName = typeof SLIDESHOWS | typeof PICTURES | typeof MUSIC | typeof IMPORTS;

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

  saveSlideshow(slideshow: StoredSlideshow): Promise<void> {
    return this.#write([SLIDESHOWS], (transaction) => {
      transaction.objectStore(SLIDESHOWS).put(slideshow);
    });
  }

  /** Reads and writes in one transaction, so a deletion in another tab cannot interleave. */
  updateSlideshow(slideshow: StoredSlideshow): Promise<void> {
    let found = true;
    const updated = this.#update([SLIDESHOWS], (transaction) => {
      const slideshows = transaction.objectStore(SLIDESHOWS);
      const existing = slideshows.getKey(slideshow.id);
      existing.onsuccess = () => {
        if (existing.result === undefined) {
          found = false;
          return;
        }
        slideshows.put(slideshow);
        // The last request is placed: commit before a reload can abort the edit.
        transaction.commit();
      };
    });
    return updated.then(() => {
      if (!found) {
        throw new SlideshowNotFoundError(slideshow.id);
      }
    });
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
    const deleted = this.#update([SLIDESHOWS, PICTURES, MUSIC], (transaction) => {
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
          transaction.objectStore(PICTURES).delete(mediaId);
          transaction.objectStore(MUSIC).delete(mediaId);
        }
        // The last request is placed: commit before a reload can abort the deletion.
        transaction.commit();
      };
    });
    return deleted.then(() => {
      if (!found) {
        throw new SlideshowNotFoundError(id);
      }
    });
  }

  async pictureBlob(id: string): Promise<Blob> {
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

  /** One read-only transaction; each record is dropped once measured, so memory stays bounded. */
  mediaBytes(slideshow: StoredSlideshow): Promise<number> {
    const transaction = this.#database.transaction([PICTURES, MUSIC], "readonly");
    let bytes = 0;
    const measure = (name: StoreName, id: string, size: (media: unknown) => number): void => {
      const request = transaction.objectStore(name).get(id);
      request.onsuccess = () => {
        bytes += request.result === undefined ? 0 : size(request.result);
      };
    };
    for (const picture of slideshow.pictures) {
      measure(PICTURES, picture.id, (media) => {
        const { display, thumbnail } = media as StoredPictureMedia;
        return display.bytes.byteLength + thumbnail.bytes.byteLength;
      });
    }
    if (slideshow.music !== undefined) {
      measure(MUSIC, slideshow.music.id, (media) => (media as StoredMedia).bytes.byteLength);
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(bytes);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("measuring the media was aborted"));
    });
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
    return this.#update([SLIDESHOWS, PICTURES, MUSIC, IMPORTS], (transaction) => {
      const slideshows = transaction.objectStore(SLIDESHOWS).getAll();
      const importStore = transaction.objectStore(IMPORTS);
      const imports = importStore.getAll();
      imports.onsuccess = () => {
        const referenced = referencedMediaIds(slideshows.result as StoredSlideshow[]);
        const { sparedMediaIds, staleClaimIds } = claimsAt(imports.result as MediaClaim[], now);
        staleClaimIds.forEach((id) => importStore.delete(id));
        for (const name of [PICTURES, MUSIC]) {
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
    });
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
    const committed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? new Error(`the write to ${names.join(", ")} was aborted`));
    });
    work(transaction);
    return committed;
  }
}

/** Opens (and creates or upgrades) the library database. */
export function openLibraryStore(indexedDB: IDBFactory): Promise<IndexedDbLibraryStore> {
  const request = indexedDB.open(LIBRARY_DATABASE_NAME, SCHEMA_VERSION);
  request.onupgradeneeded = (event) => {
    const database = request.result;
    if (event.oldVersion < 1) {
      database.createObjectStore(SLIDESHOWS, { keyPath: "id" });
      database.createObjectStore(PICTURES);
      database.createObjectStore(MUSIC);
    }
    if (event.oldVersion < IMPORTS_ADDED_IN) {
      database.createObjectStore(IMPORTS, { keyPath: "id" });
    }
  };
  return requestResult(request).then(() => new IndexedDbLibraryStore(request.result));
}
