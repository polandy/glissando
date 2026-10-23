import { parsePlaceList, type PlaceIndex } from "./nearest-place";

export interface PlaceDataLoader {
  /** Fetches and parses the place list exactly once; later calls return the same result
   *  (memoised), including concurrent calls while the first fetch is in flight. */
  load(): Promise<PlaceIndex>;
}

/** `fetchText` is injected (e.g. the composition root wires `() => fetch(url).then(r => r.text())`)
 *  — this module never imports `fetch` or knows a URL, and is never a module-level singleton:
 *  each call to this factory makes its own independent, freshly-memoised loader. */
export function createPlaceDataLoader(fetchText: () => Promise<string>): PlaceDataLoader {
  // Memoises the in-flight/completed attempt so concurrent load() calls share one fetchText()
  // call; cleared on rejection (never cached) so a later load() retries instead of being wedged
  // by a transient failure for the rest of the session.
  let pendingAttempt: Promise<PlaceIndex> | null = null;

  async function load(): Promise<PlaceIndex> {
    if (pendingAttempt === null) {
      pendingAttempt = fetchText().then(parsePlaceList);
    }
    const attempt = pendingAttempt;
    try {
      return await attempt;
    } catch (error) {
      // Only clear the attempt this call started waiting on: a concurrent retry may already
      // have replaced it by the time this rejection is handled.
      if (pendingAttempt === attempt) {
        pendingAttempt = null;
      }
      throw error;
    }
  }

  return { load };
}
