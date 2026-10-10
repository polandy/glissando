import { completed } from "./indexeddb-records";
import { SLIDESHOWS } from "./indexeddb-schema";
import { SlideshowNotFoundError, type StoredSlideshow } from "./stored-slideshow";

/**
 * Replaces the slideshow record `id` with `edit` of it, read and written in one transaction, so
 * a write in another tab cannot interleave; see `LibraryStore.updateSlideshowWith`.
 */
export async function editSlideshowRecord(
  database: IDBDatabase,
  id: string,
  edit: (current: StoredSlideshow) => StoredSlideshow,
): Promise<StoredSlideshow> {
  const outcome: { edited?: StoredSlideshow; editError?: { readonly cause: unknown } } = {};
  const transaction = database.transaction([SLIDESHOWS], "readwrite");
  const committed = completed(transaction, () => undefined, `the edit of slideshow ${id}`);
  const slideshows = transaction.objectStore(SLIDESHOWS);
  const existing = slideshows.get(id);
  existing.onsuccess = () => {
    if (existing.result === undefined) {
      return;
    }
    try {
      outcome.edited = edit(existing.result as StoredSlideshow);
    } catch (error) {
      outcome.editError = { cause: error };
      transaction.abort();
      return;
    }
    slideshows.put(outcome.edited);
    // The last request is placed: commit before a reload can abort the edit.
    transaction.commit();
  };
  await committed.catch((error: unknown) => {
    if (outcome.editError === undefined) {
      throw error;
    }
  });
  if (outcome.editError !== undefined) {
    throw outcome.editError.cause;
  }
  if (outcome.edited === undefined) {
    throw new SlideshowNotFoundError(id);
  }
  return outcome.edited;
}
