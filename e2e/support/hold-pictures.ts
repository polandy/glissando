import type { Page } from "@playwright/test";
import { LIBRARY_DATABASE_NAME } from "../../src/library/indexeddb-store";

/** The library's object store of picture files. */
const PICTURE_STORE = "pictures";

/** Where the page keeps the release of a held picture store. */
interface HoldingWindow {
  releasePictureStore?: () => void;
}

/**
 * Holds the library's picture store with a read-write transaction kept alive until released.
 * IndexedDB starts a later transaction on that store only after this one ends, so the app's
 * reads and writes of picture files wait: a pause that lets a case see the progress of a flow
 * that would otherwise end before it could look. Returns the release.
 */
export async function holdPictureStore(page: Page): Promise<() => Promise<void>> {
  await page.evaluate(
    ({ database, store }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onerror = () => reject(request.error ?? new Error(`cannot open ${database}`));
        request.onsuccess = () => {
          const connection = request.result;
          const transaction = connection.transaction(store, "readwrite");
          const pictures = transaction.objectStore(store);
          let held = true;
          // A transaction ends once no request is pending, so one request follows the next.
          const keepAlive = (): void => {
            if (held) {
              pictures.count().onsuccess = keepAlive;
            }
          };
          keepAlive();
          transaction.oncomplete = () => connection.close();
          (globalThis as HoldingWindow).releasePictureStore = () => {
            held = false;
          };
          resolve();
        };
      }),
    { database: LIBRARY_DATABASE_NAME, store: PICTURE_STORE },
  );
  return () => page.evaluate(() => (globalThis as HoldingWindow).releasePictureStore?.());
}
