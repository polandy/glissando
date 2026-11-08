import { DOM_EXCEPTION, isDomException } from "../dom-exception/dom-exception";

/** Whether the error, or any error in its `cause` chain, is a storage-quota error. */
export function isQuotaExceeded(error: unknown): boolean {
  if (isDomException(error, DOM_EXCEPTION.quotaExceeded)) return true;
  return error instanceof Error && error.cause !== undefined && isQuotaExceeded(error.cause);
}
