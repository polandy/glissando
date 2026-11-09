import { describe, expect, it } from "vitest";
import { MAX_TITLE_LENGTH } from "../library/slideshow-edits";
import { dayRangeForCaptureRange } from "./day-range-for-capture-range";
import {
  distinctTitleForCaptureRange,
  typedTitleOrAutomatic,
} from "./distinct-title-for-capture-range";

const JULY_12_TO_19 = ["2025-07-12T10:00:00Z", "2025-07-19T18:00:00Z"];

// Intl writes the range with narrow spaces, so the expectation asks the same formatter.
const DAY_RANGE_EN = dayRangeForCaptureRange(JULY_12_TO_19, "en");

describe("distinctTitleForCaptureRange", () => {
  it("is the month title while no other slideshow has it", () => {
    expect(distinctTitleForCaptureRange(JULY_12_TO_19, "en", [])).toBe("July 2025");
    expect(
      distinctTitleForCaptureRange(JULY_12_TO_19, "en", [
        { title: "June 2025", capturedAt: JULY_12_TO_19 },
      ]),
    ).toBe("July 2025");
  });

  it("is the day range when another slideshow of other days has the month title", () => {
    const existing = [{ title: "July 2025", capturedAt: ["2025-07-01T10:00:00Z"] }];
    expect(distinctTitleForCaptureRange(JULY_12_TO_19, "en", existing)).toBe(DAY_RANGE_EN);
    expect(
      distinctTitleForCaptureRange(JULY_12_TO_19, "de", [
        { title: "Juli 2025", capturedAt: existing[0]?.capturedAt ?? [] },
      ]),
    ).toBe("12.–19. Juli 2025");
  });

  it("numbers the month title when a slideshow of the same days has it", () => {
    const existing = [{ title: "July 2025", capturedAt: JULY_12_TO_19 }];
    expect(distinctTitleForCaptureRange(JULY_12_TO_19, "en", existing)).toBe("July 2025 · 2");
    expect(
      distinctTitleForCaptureRange(JULY_12_TO_19, "de", [
        { title: "Juli 2025", capturedAt: existing[0]?.capturedAt ?? [] },
      ]),
    ).toBe("Juli 2025 · 2");
  });

  it("takes the lowest free number from 2", () => {
    const existing = [
      { title: "July 2025", capturedAt: JULY_12_TO_19 },
      { title: "July 2025 · 2", capturedAt: JULY_12_TO_19 },
      { title: "July 2025 · 4", capturedAt: JULY_12_TO_19 },
    ];
    expect(distinctTitleForCaptureRange(JULY_12_TO_19, "en", existing)).toBe("July 2025 · 3");
  });

  it("numbers the day range when it is taken too", () => {
    const existing = [
      { title: "July 2025", capturedAt: ["2025-07-01T10:00:00Z"] },
      { title: DAY_RANGE_EN, capturedAt: ["2025-07-02T10:00:00Z"] },
    ];
    expect(distinctTitleForCaptureRange(JULY_12_TO_19, "en", existing)).toBe(`${DAY_RANGE_EN} · 2`);
  });

  it("compares capture days, not times", () => {
    const sameDays = ["2025-07-12T01:00:00Z", "2025-07-19T23:00:00Z"];
    expect(
      distinctTitleForCaptureRange(JULY_12_TO_19, "en", [
        { title: "July 2025", capturedAt: sameDays },
      ]),
    ).toBe("July 2025 · 2");
  });

  it("rejects an empty list of dates", () => {
    expect(() => distinctTitleForCaptureRange([], "en", [])).toThrow(RangeError);
  });
});

describe("typedTitleOrAutomatic", () => {
  it("is the typed title without surrounding blanks", () => {
    expect(typedTitleOrAutomatic("  Sommer am See ", "July 2025")).toBe("Sommer am See");
  });

  it.each(["", "   ", "\t"])("falls back to the automatic title for %j", (typed) => {
    expect(typedTitleOrAutomatic(typed, "July 2025")).toBe("July 2025");
  });

  it("cuts a title at the length a rename allows", () => {
    expect(typedTitleOrAutomatic("x".repeat(MAX_TITLE_LENGTH + 20), "July 2025")).toBe(
      "x".repeat(MAX_TITLE_LENGTH),
    );
  });
});
