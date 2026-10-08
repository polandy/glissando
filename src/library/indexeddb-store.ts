import { importsAt, newestFirst, referencedMediaIds, withImportMedia } from "./slideshow-queries";
import {
  MediaNotFoundError,
  SlideshowNotFoundError,
  type ImportInProgress,
  type LibraryStore,
  type PictureBlobs,
  type StoredSlideshow,
} from "./stored-slideshow";

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

/**
 * Media is kept as bytes plus MIME type, not as a Blob: WebKit refuses Blobs in IndexedDB in
 * ephemeral sessions (private browsing), bytes it stores everywhere.
 */
interface StoredMedia {
  readonly bytes: ArrayBuffer;
  readonly type: string;
}

interface StoredPictureMedia {
  readonly display: StoredMedia;
  readonly thumbnail: StoredMedia;
}

async function toStoredMedia(blob: Blob): Promise<StoredMedia> {
  return { bytes: await blob.arrayBuffer(), type: blob.type };
}

function toBlob(media: StoredMedia): Blob {
  return new Blob([media.bytes], { type: media.type });
}

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

  recordImportMedia(importId: string, startedAt: Date, mediaId: string): Promise<void> {
    return this.#write([IMPORTS], (transaction) => {
      const imports = transaction.objectStore(IMPORTS);
      const existing = imports.get(importId);
      existing.onsuccess = () => {
        const record = existing.result as ImportInProgress | undefined;
        imports.put(withImportMedia(record, importId, startedAt, mediaId));
      };
    });
  }

  endImport(importId: string): Promise<void> {
    return this.#write([IMPORTS], (transaction) => {
      transaction.objectStore(IMPORTS).delete(importId);
    });
  }

  /**
   * Reads the references and imports and deletes in one transaction, so a concurrent save or
   * claim cannot interleave.
   */
  deleteUnreferencedMedia(now: Date): Promise<void> {
    return this.#write([SLIDESHOWS, PICTURES, MUSIC, IMPORTS], (transaction) => {
      const slideshows = transaction.objectStore(SLIDESHOWS).getAll();
      const importStore = transaction.objectStore(IMPORTS);
      const imports = importStore.getAll();
      imports.onsuccess = () => {
        const referenced = referencedMediaIds(slideshows.result as StoredSlideshow[]);
        const { sparedMediaIds, staleImportIds } = importsAt(
          imports.result as ImportInProgress[],
          now,
        );
        staleImportIds.forEach((id) => importStore.delete(id));
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

  /** Resolves once the transaction has committed; rejects with its error (e.g. QuotaExceededError). */
  #write(names: StoreName[], work: (transaction: IDBTransaction) => void): Promise<void> {
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

function requestResult(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("an IndexedDB request failed"));
  });
}
