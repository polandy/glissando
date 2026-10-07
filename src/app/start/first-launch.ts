export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export interface FirstLaunchStore {
  hasLaunchedBefore(): boolean;
  recordLaunch(): void;
}

const LAUNCHED_KEY = "glissando.launched";
const LAUNCHED_VALUE = "true";

/** Whether this is the app's first launch; from then on it never is again. */
export function consumeFirstLaunch(store: FirstLaunchStore): boolean {
  if (store.hasLaunchedBefore()) {
    return false;
  }
  store.recordLaunch();
  return true;
}

export function createStorageFirstLaunchStore(storage: KeyValueStorage): FirstLaunchStore {
  return {
    hasLaunchedBefore: () => storage.getItem(LAUNCHED_KEY) !== null,
    recordLaunch: () => storage.setItem(LAUNCHED_KEY, LAUNCHED_VALUE),
  };
}
