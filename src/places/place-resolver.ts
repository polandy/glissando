import type { ExifGps } from "../import/exif-gps";
import { nearestPlace, type Place, type PlaceIndex } from "./nearest-place";

/** Resolves a position to its nearest place. After the place list fails to load once, it logs
 *  that once and answers `null` without loading again, so a missing file is not refetched per
 *  picture. */
export function createPlaceResolver(
  load: () => Promise<PlaceIndex>,
  log: (error: unknown) => void,
): (gps: ExifGps) => Promise<Place | null> {
  let gaveUp = false;
  return async (gps) => {
    if (gaveUp) {
      return null;
    }
    try {
      return nearestPlace(await load(), gps.latitude, gps.longitude);
    } catch (error) {
      gaveUp = true;
      log(error);
      return null;
    }
  };
}
