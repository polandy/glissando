/** The browser's error when a write exceeds the origin's storage quota. */
const QUOTA_EXCEEDED = "QuotaExceededError";

/** Whether the error, or any error in its `cause` chain, is a storage-quota error. */
export function isQuotaExceeded(error: unknown): boolean {
  if (error instanceof DOMException && error.name === QUOTA_EXCEEDED) return true;
  return error instanceof Error && error.cause !== undefined && isQuotaExceeded(error.cause);
}
