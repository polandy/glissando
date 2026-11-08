import { isQuotaExceeded } from "../../storage-quota/is-quota-exceeded";

/**
 * The device ran out of storage or memory: a quota error from IndexedDB or the Blob store, or
 * a `RangeError` from an allocation that failed. The user can free space and try again.
 */
export function isStorageShortage(error: unknown): boolean {
  return isQuotaExceeded(error) || error instanceof RangeError;
}
