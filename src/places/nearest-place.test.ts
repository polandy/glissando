import { describe, expect, it } from "vitest";
import { nearestPlace, parsePlaceList, PLACE_LOOKUP_MAX_KM } from "./nearest-place";

// A small, hand-written stand-in for the bundled GeoNames TSV (name\tlatitude\tlongitude).
// Each place below exists to prove exactly one behaviour; see the test that names it.
const LISBON = "Lisbon\t38.717\t-9.133";
const SINTRA = "Sintra\t38.800\t-9.378";
const FARO = "Faro\t37.017\t-7.935";
// Sits just east of the antimeridian; proves longitude-cell wraparound.
const DATELINE_PLACE = "Dateline Place\t10.000\t179.950";
// Sits close to the north pole; proves latitude cells beyond the pole don't crash the lookup.
const POLE_PLACE = "Pole Place\t89.900\t10.000";
// Sits just across a round-number latitude-cell boundary from its test query; proves the
// neighbour-cell search, not just a same-cell lookup.
const GRID_BOUNDARY_TOWN = "Grid Boundary Town\t40.001\t2.001";
// Isolated from every other fixture place; proves the PLACE_LOOKUP_MAX_KM boundary exactly,
// with no other place close enough to interfere.
const BOUNDARY_TOWN = "Boundary Town\t0.000\t50.000";

const FIXTURE_TSV = [
  LISBON,
  SINTRA,
  FARO,
  DATELINE_PLACE,
  POLE_PLACE,
  GRID_BOUNDARY_TOWN,
  BOUNDARY_TOWN,
].join("\n");

const fixtureIndex = () => parsePlaceList(FIXTURE_TSV);

describe("parsePlaceList", () => {
  it("parses a well-formed TSV place list", () => {
    const index = fixtureIndex();

    expect(nearestPlace(index, 38.717, -9.133)).toEqual({
      name: "Lisbon",
      latitude: 38.717,
      longitude: -9.133,
    });
  });

  it("parses a trailing newline's empty final line without error", () => {
    expect(() => parsePlaceList(`${FIXTURE_TSV}\n`)).not.toThrow();
  });

  it("returns an index that resolves every lookup to null when given an empty string", () => {
    const index = parsePlaceList("");

    expect(nearestPlace(index, 38.717, -9.133)).toBeNull();
  });

  it.each([
    ["too few columns", "Nowhere\t38.717"],
    ["too many columns", "Nowhere\t38.717\t-9.133\textra"],
    ["a non-numeric latitude", "Nowhere\tabc\t-9.133"],
    ["a non-numeric longitude", "Lisbon\t38.717\tabc"],
    ["an empty name", "\t38.717\t-9.133"],
  ])("throws naming the bad line on %s", (_, badLine) => {
    const tsvWithBadLine = [LISBON, badLine, SINTRA].join("\n");

    expect(() => parsePlaceList(tsvWithBadLine)).toThrow(/line 2/);
  });
});

describe("nearestPlace", () => {
  it("resolves a place's exact coordinates to that place, at distance 0", () => {
    const index = fixtureIndex();

    expect(nearestPlace(index, 37.017, -7.935)).toEqual({
      name: "Faro",
      latitude: 37.017,
      longitude: -7.935,
    });
  });

  it("resolves a point near Lisbon to Lisbon, not the more distant Sintra or Faro", () => {
    const index = fixtureIndex();

    const result = nearestPlace(index, 38.72, -9.14);

    expect(result?.name).toBe("Lisbon");
  });

  it("picks the actually-nearer of two close places, proven by distance, not just any match", () => {
    const index = fixtureIndex();
    // Roughly between Lisbon and Sintra, nudged slightly toward Sintra: independently measured
    // (haversine, not the module under test) at ~12.48 km from Lisbon and ~10.68 km from
    // Sintra — Sintra is nearer, and Faro (~226 km away) is nowhere close.
    const query = { latitude: 38.76170862967957, longitude: -9.26497125628306 };

    const result = nearestPlace(index, query.latitude, query.longitude);

    expect(result?.name).toBe("Sintra");
  });

  it("returns null for a point far from every bundled place", () => {
    const index = fixtureIndex();

    // Mid-Atlantic: thousands of km from every fixture place above.
    expect(nearestPlace(index, 38.0, -30.0)).toBeNull();
  });

  it("finds a place just inside PLACE_LOOKUP_MAX_KM", () => {
    const index = fixtureIndex();
    // 0.4487614813534465° due north of Boundary Town (0, 50) is 49.9 km away by the great-circle
    // arc along a meridian, independently of this module.
    const justInsideKm = 49.9;
    expect(justInsideKm).toBeLessThan(PLACE_LOOKUP_MAX_KM);

    const result = nearestPlace(index, 0.4487614813534465, 50.0);

    expect(result?.name).toBe("Boundary Town");
  });

  it("returns null for a point just outside PLACE_LOOKUP_MAX_KM from the same place", () => {
    const index = fixtureIndex();
    // 0.450560124565284° due north of Boundary Town (0, 50) is 50.1 km away by the same
    // meridian-arc measurement — just across the boundary the previous test lands just inside.
    const justOutsideKm = 50.1;
    expect(justOutsideKm).toBeGreaterThan(PLACE_LOOKUP_MAX_KM);

    const result = nearestPlace(index, 0.450560124565284, 50.0);

    expect(result).toBeNull();
  });

  it("finds a place in a neighbouring grid cell, not just the query's own cell", () => {
    const index = fixtureIndex();
    // Grid Boundary Town is at latitude 40.001 (cell 40); this query sits at latitude 39.999
    // (cell 39) — a different cell, ~0.22 km away. A same-cell-only lookup would miss it.
    const result = nearestPlace(index, 39.999, 2.001);

    expect(result?.name).toBe("Grid Boundary Town");
  });

  it("finds a place across the antimeridian, proving longitude-cell wraparound", () => {
    const index = fixtureIndex();
    // Dateline Place sits at longitude 179.950; this query sits at -179.950, ~10.95 km away
    // the short way across the antimeridian. Without wraparound the cell indices would differ
    // by hundreds, and the place would be missed.
    const result = nearestPlace(index, 10.0, -179.95);

    expect(result?.name).toBe("Dateline Place");
  });

  it("finds a place near the pole without crashing or misbehaving", () => {
    const index = fixtureIndex();
    // Pole Place sits at latitude 89.900; this query sits at 89.999, whose neighbour search
    // reaches for a cell beyond latitude 90 that simply does not exist in the index.
    const result = nearestPlace(index, 89.999, 10.05);

    expect(result?.name).toBe("Pole Place");
  });
});
