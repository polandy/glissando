import { describe, expect, it } from "vitest";
import type { Place } from "../places/nearest-place";
import type { StoredPicture } from "../library/stored-slideshow";
import { staysOf } from "./chapter-stays";

// Lisbon and Sintra are roughly 25 km apart; Porto is far from both. Coordinates are made up
// for this test, not real GPS traces.
const LISBON: Place = { name: "Lisbon", latitude: 38.7223, longitude: -9.1393 };
const SINTRA: Place = { name: "Sintra", latitude: 38.8029, longitude: -9.3817 };
const PORTO: Place = { name: "Porto", latitude: 41.1579, longitude: -8.6291 };

function picture(id: string, capturedAt: string, place?: Place): StoredPicture {
  return {
    id,
    fileName: `${id}.jpg`,
    capturedAt,
    width: 100,
    height: 100,
    colours: { veil: "#202020", accent: "#e0e0e0" },
    ...(place === undefined ? {} : { place }),
  };
}

describe("staysOf", () => {
  it("is one stay for a show that never leaves one place", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-27T09:00:00Z", LISBON),
    ];
    const stays = staysOf(pictures);
    expect(stays).toEqual([{ startDay: 1, endDay: 14, place: LISBON, firstPicture: pictures[0] }]);
  });

  it("is one stay for a show with no place data at all", () => {
    const pictures = [picture("p1", "2025-06-14T09:00:00Z"), picture("p2", "2025-06-15T09:00:00Z")];
    const stays = staysOf(pictures);
    expect(stays).toEqual([
      { startDay: 1, endDay: 2, place: undefined, firstPicture: pictures[0] },
    ]);
  });

  it("starts a new stay once the main place strays beyond the radius", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-15T09:00:00Z", PORTO),
    ];
    const stays = staysOf(pictures);
    expect(stays).toEqual([
      { startDay: 1, endDay: 1, place: LISBON, firstPicture: pictures[0] },
      { startDay: 2, endDay: 2, place: PORTO, firstPicture: pictures[1] },
    ]);
  });

  it("keeps a day trip within one stay, both before and after", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-15T09:00:00Z", SINTRA),
      picture("p3", "2025-06-16T09:00:00Z", LISBON),
    ];
    expect(staysOf(pictures)).toEqual([
      { startDay: 1, endDay: 3, place: LISBON, firstPicture: pictures[0] },
    ]);
  });

  it("makes a day trip away and back a separate stay in between (Lisbon-Sintra-Lisbon)", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-15T09:00:00Z", PORTO),
      picture("p3", "2025-06-16T09:00:00Z", LISBON),
    ];
    expect(staysOf(pictures)).toEqual([
      { startDay: 1, endDay: 1, place: LISBON, firstPicture: pictures[0] },
      { startDay: 2, endDay: 2, place: PORTO, firstPicture: pictures[1] },
      { startDay: 3, endDay: 3, place: LISBON, firstPicture: pictures[2] },
    ]);
  });

  it("continues the open stay across a day with no placed pictures", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-15T09:00:00Z"),
      picture("p3", "2025-06-16T09:00:00Z", LISBON),
    ];
    expect(staysOf(pictures)).toEqual([
      { startDay: 1, endDay: 3, place: LISBON, firstPicture: pictures[0] },
    ]);
  });

  it("continues the open stay across a calendar gap day", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      // 2025-06-15 has no picture at all (day 2 is an empty gap).
      picture("p2", "2025-06-16T09:00:00Z", LISBON),
    ];
    expect(staysOf(pictures)).toEqual([
      { startDay: 1, endDay: 3, place: LISBON, firstPicture: pictures[0] },
    ]);
  });

  it("lazily sets a stay's place once its first placed day arrives", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z"),
      picture("p2", "2025-06-15T09:00:00Z", LISBON),
      picture("p3", "2025-06-16T09:00:00Z", PORTO),
    ];
    expect(staysOf(pictures)).toEqual([
      { startDay: 1, endDay: 2, place: LISBON, firstPicture: pictures[0] },
      { startDay: 3, endDay: 3, place: PORTO, firstPicture: pictures[2] },
    ]);
  });

  it("is empty for no pictures", () => {
    expect(staysOf([])).toEqual([]);
  });
});
