/** The `name`s of the DOMExceptions the browser's APIs reject with that the app tells apart. */
export const DOM_EXCEPTION = {
  /** A dismissed share sheet or save picker, or an interrupted `play()`. */
  aborted: "AbortError",
  /** A write beyond the origin's storage quota. */
  quotaExceeded: "QuotaExceededError",
  notFound: "NotFoundError",
} as const;

export function isDomException(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}
