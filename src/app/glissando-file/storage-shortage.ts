/** The browser's error when a write exceeds the origin's storage quota. */
const QUOTA_EXCEEDED = "QuotaExceededError";

/**
 * The device ran out of storage or memory: a quota error from IndexedDB or the Blob store, or
 * a `RangeError` from an allocation that failed. The user can free space and try again.
 */
export function isStorageShortage(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === QUOTA_EXCEEDED) || error instanceof RangeError
  );
}

/** Only the storage quota: a write that ran out of room. */
export function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === QUOTA_EXCEEDED;
}
