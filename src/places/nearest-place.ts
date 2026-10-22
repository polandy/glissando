/** A single named place from the bundled GeoNames place list. */
export interface Place {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
}

/** Beyond this, a picture counts as having no resolved place (e.g. at sea). */
export const PLACE_LOOKUP_MAX_KM = 50;

/** Mean Earth radius (km), the one constant the haversine distance below depends on. */
const EARTH_RADIUS_KM = 6371;

/** Places are bucketed into 1°-latitude x 1°-longitude cells; see {@link nearestPlace}. */
const GRID_CELL_SIZE_DEGREES = 1;

/** The 3x3 block of cells a lookup checks: the query's own cell and its 8 neighbours. */
const NEIGHBOUR_CELL_OFFSETS = [-1, 0, 1] as const;

const FULL_CIRCLE_DEGREES = 360;
const HALF_CIRCLE_DEGREES = 180;
const DEGREES_PER_RADIAN = HALF_CIRCLE_DEGREES / Math.PI;

/** Joins a cell's latitude and longitude indices into one `Map` key. */
const CELL_KEY_SEPARATOR = ":";

/** The number of tab-separated fields a well-formed place line has (name, latitude, longitude). */
const PLACE_LINE_FIELD_COUNT = 3;

/**
 * A lookup index built by {@link parsePlaceList} and consumed by {@link nearestPlace}. Opaque to
 * callers — the grid-of-cells shape is this module's own business.
 */
export interface PlaceIndex {
  readonly placesByCellKey: ReadonlyMap<string, readonly Place[]>;
}

function toRadians(degrees: number): number {
  return degrees / DEGREES_PER_RADIAN;
}

/**
 * Longitude cells wrap at the antimeridian (1° wide, so cell 180 and cell -180 are the same
 * meridian): normalize into [-180, 180) with a double modulo, since JS's `%` keeps the sign of
 * its left operand and would otherwise leave a cell index like -181 unmatched.
 */
function normalizeLongitudeCell(longitudeCell: number): number {
  const wrapped =
    ((longitudeCell % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
  return wrapped >= HALF_CIRCLE_DEGREES ? wrapped - FULL_CIRCLE_DEGREES : wrapped;
}

function latitudeCell(latitude: number): number {
  return Math.floor(latitude / GRID_CELL_SIZE_DEGREES);
}

function longitudeCell(longitude: number): number {
  return normalizeLongitudeCell(Math.floor(longitude / GRID_CELL_SIZE_DEGREES));
}

function cellKey(latCell: number, lonCell: number): string {
  return `${latCell}${CELL_KEY_SEPARATOR}${lonCell}`;
}

/**
 * Great-circle distance (km) by the haversine formula. For two points on the same meridian
 * (equal longitude) this is exact — the path is a meridian arc, itself a great circle — which is
 * what the PLACE_LOOKUP_MAX_KM boundary tests measure against independently of this function.
 */
function greatCircleDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const sinHalfDeltaLatitude = Math.sin(deltaLatitude / 2);
  const sinHalfDeltaLongitude = Math.sin(deltaLongitude / 2);
  const haversine =
    sinHalfDeltaLatitude * sinHalfDeltaLatitude +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      sinHalfDeltaLongitude *
      sinHalfDeltaLongitude;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * centralAngle;
}

function parsePlaceLine(line: string, lineNumber: number): Place {
  const fields = line.split("\t");
  const [name, latitudeText, longitudeText, unexpectedExtraField] = fields;
  if (
    name === undefined ||
    latitudeText === undefined ||
    longitudeText === undefined ||
    unexpectedExtraField !== undefined
  ) {
    throw new Error(
      `place list line ${lineNumber}: expected ${PLACE_LINE_FIELD_COUNT} tab-separated fields ` +
        `(name, latitude, longitude), got ${JSON.stringify(line)}`,
    );
  }
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  if (name === "" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(
      `place list line ${lineNumber}: invalid name or coordinates, got ${JSON.stringify(line)}`,
    );
  }
  return { name, latitude, longitude };
}

/** Parses the bundled TSV place list into a lookup index. Throws on a line that cannot be parsed
 *  (fail loud — this is bundled, trusted build output, never user input; a malformed line means
 *  the build step is broken). */
export function parsePlaceList(tsvText: string): PlaceIndex {
  const lines = tsvText.split("\n");
  // A trailing newline produces one trailing empty element; drop only that one.
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const placesByCellKey = new Map<string, Place[]>();
  lines.forEach((line, index) => {
    const place = parsePlaceLine(line, index + 1);
    const key = cellKey(latitudeCell(place.latitude), longitudeCell(place.longitude));
    const placesInCell = placesByCellKey.get(key);
    if (placesInCell) {
      placesInCell.push(place);
    } else {
      placesByCellKey.set(key, [place]);
    }
  });

  return { placesByCellKey };
}

/** The nearest place to (latitude, longitude) by great-circle distance, within
 *  PLACE_LOOKUP_MAX_KM; null beyond that (or for an empty index).
 *
 *  Looks at the query's cell and its 8 neighbours (a 3x3 block), not just its own cell, so a
 *  place just across a cell boundary is not missed. A 1° cell is roughly 111 km tall and up to
 *  111 km wide at the equator (narrower nearer the poles), so a 3x3 block spans well over the
 *  50 km radius in every direction. This finds the nearest place *within the 3x3 block*: a
 *  correct and sufficient approximation of "nearest within 50 km" for this bundled, sparse
 *  (>=15k population) dataset, not a literal nearest-neighbour-on-the-sphere guarantee in
 *  extreme edge cases. */
export function nearestPlace(
  index: PlaceIndex,
  latitude: number,
  longitude: number,
): Place | null {
  const baseLatCell = latitudeCell(latitude);
  const baseLonCell = longitudeCell(longitude);

  let nearest: Place | null = null;
  let nearestDistanceKm = Infinity;

  for (const latOffset of NEIGHBOUR_CELL_OFFSETS) {
    for (const lonOffset of NEIGHBOUR_CELL_OFFSETS) {
      // Latitude cells beyond the poles (e.g. 90, -91) simply have no entry — no wrap, no crash.
      const key = cellKey(
        baseLatCell + latOffset,
        normalizeLongitudeCell(baseLonCell + lonOffset),
      );
      const placesInCell = index.placesByCellKey.get(key);
      if (!placesInCell) {
        continue;
      }
      for (const place of placesInCell) {
        const distanceKm = greatCircleDistanceKm(
          latitude,
          longitude,
          place.latitude,
          place.longitude,
        );
        if (distanceKm < nearestDistanceKm) {
          nearestDistanceKm = distanceKm;
          nearest = place;
        }
      }
    }
  }

  return nearestDistanceKm <= PLACE_LOOKUP_MAX_KM ? nearest : null;
}
