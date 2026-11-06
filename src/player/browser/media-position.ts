export const HAVE_CURRENT_DATA = 2;
export const HAVE_FUTURE_DATA = 3;
export const HAVE_ENOUGH_DATA = 4;

/**
 * Where a media element is in its file while it really plays; null while it is paused, seeking,
 * or has too little data buffered to play on (starting up or stalled).
 */
export function playingSecondsOf(
  element: Pick<HTMLMediaElement, "paused" | "seeking" | "readyState" | "currentTime">,
): number | null {
  if (element.seeking || element.paused || element.readyState < HAVE_FUTURE_DATA) {
    return null;
  }
  return element.currentTime;
}
