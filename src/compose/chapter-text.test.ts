import { describe, expect, it } from "vitest";
import { dateOnlySubtitle, dayTitle, multiDaySubtitle, singleDaySubtitle } from "./chapter-text";

// 2025-06-14 is a Saturday; 2025-06-21 the following Saturday, both UTC midnight.
const JUNE_14 = new Date(Date.UTC(2025, 5, 14));
const JUNE_20 = new Date(Date.UTC(2025, 5, 20));
const JUNE_21 = new Date(Date.UTC(2025, 5, 21));
const JUNE_28 = new Date(Date.UTC(2025, 5, 28));
const JULY_2 = new Date(Date.UTC(2025, 6, 2));

describe("multiDaySubtitle", () => {
  it("formats a same-month range in English", () => {
    expect(multiDaySubtitle(3, 9, JUNE_14, JUNE_20, "en")).toBe("Day 3–9 · 14–20 June");
  });

  it("formats a same-month range in German, with the trailing dot", () => {
    expect(multiDaySubtitle(3, 9, JUNE_14, JUNE_20, "de")).toBe("Tag 3–9 · 14.–20. Juni");
  });

  it("formats a cross-month range in English", () => {
    expect(multiDaySubtitle(8, 12, JUNE_28, JULY_2, "en")).toBe("Day 8–12 · 28 June – 2 July");
  });

  it("formats a cross-month range in German", () => {
    expect(multiDaySubtitle(8, 12, JUNE_28, JULY_2, "de")).toBe("Tag 8–12 · 28. Juni – 2. Juli");
  });
});

describe("singleDaySubtitle", () => {
  it("formats a single day in English", () => {
    expect(singleDaySubtitle(10, JUNE_21, "en")).toBe("Day 10 · Saturday, 21 June");
  });

  it("formats a single day in German", () => {
    expect(singleDaySubtitle(10, JUNE_21, "de")).toBe("Tag 10 · Samstag, 21. Juni");
  });
});

describe("dateOnlySubtitle", () => {
  it("formats the weekday and date alone in English", () => {
    expect(dateOnlySubtitle(JUNE_14, "en")).toBe("Saturday, 14 June");
  });

  it("formats the weekday and date alone in German", () => {
    expect(dateOnlySubtitle(JUNE_14, "de")).toBe("Samstag, 14. Juni");
  });
});

describe("dayTitle", () => {
  it("is 'Day N' in English", () => {
    expect(dayTitle(3, "en")).toBe("Day 3");
  });

  it("is 'Tag N' in German", () => {
    expect(dayTitle(3, "de")).toBe("Tag 3");
  });
});
