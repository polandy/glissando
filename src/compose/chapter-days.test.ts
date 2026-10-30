import { describe, expect, it } from "vitest";
import type { Place } from "../places/nearest-place";
import type { StoredPicture } from "../library/stored-slideshow";
import { dateOfDay, dayNumbersOf, showDays } from "./chapter-days";

const LISBON: Place = { name: "Lisbon", latitude: 38.7223, longitude: -9.1393 };
const SINTRA: Place = { name: "Sintra", latitude: 38.8029, longitude: -9.3817 };

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

describe("dayNumbersOf", () => {
  it("numbers the first calendar day of the show as day 1", () => {
    const pictures = [picture("p1", "2025-06-14T09:00:00Z"), picture("p2", "2025-06-14T18:00:00Z")];
    expect(dayNumbersOf(pictures).map((n) => n.day)).toEqual([1, 1]);
  });

  it("keeps a calendar gap from renumbering the days after it", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z"),
      // 2025-06-15 has no picture.
      picture("p2", "2025-06-16T09:00:00Z"),
    ];
    expect(dayNumbersOf(pictures).map((n) => n.day)).toEqual([1, 3]);
  });

  it("numbers by capture date, not by array order", () => {
    const pictures = [picture("p2", "2025-06-16T09:00:00Z"), picture("p1", "2025-06-14T09:00:00Z")];
    expect(dayNumbersOf(pictures).map((n) => n.day)).toEqual([3, 1]);
  });

  it("is empty for no pictures", () => {
    expect(dayNumbersOf([])).toEqual([]);
  });
});

describe("dateOfDay", () => {
  it("returns the calendar date for a day number, counted from the earliest picture", () => {
    const pictures = [picture("p1", "2025-06-14T09:00:00Z")];
    const date = dateOfDay(pictures, 3);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(5);
    expect(date.getUTCDate()).toBe(16);
  });

  it("throws for no pictures", () => {
    expect(() => dateOfDay([], 1)).toThrow(RangeError);
  });
});

describe("showDays", () => {
  it("includes an empty day for a calendar gap", () => {
    const pictures = [picture("p1", "2025-06-14T09:00:00Z"), picture("p2", "2025-06-16T09:00:00Z")];
    const days = showDays(pictures);
    expect(days.map((d) => d.day)).toEqual([1, 2, 3]);
    expect(days[1]?.pictures).toEqual([]);
  });

  it("picks the most common place as the day's main place", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-14T10:00:00Z", SINTRA),
      picture("p3", "2025-06-14T11:00:00Z", LISBON),
    ];
    expect(showDays(pictures)[0]?.mainPlace).toEqual(LISBON);
  });

  it("breaks a tie by the first appearing place", () => {
    const pictures = [
      picture("p1", "2025-06-14T09:00:00Z", SINTRA),
      picture("p2", "2025-06-14T10:00:00Z", LISBON),
    ];
    expect(showDays(pictures)[0]?.mainPlace).toEqual(SINTRA);
  });

  it("has no main place for a day with no placed pictures", () => {
    const pictures = [picture("p1", "2025-06-14T09:00:00Z")];
    expect(showDays(pictures)[0]?.mainPlace).toBeUndefined();
  });

  it("is empty for no pictures", () => {
    expect(showDays([])).toEqual([]);
  });
});
