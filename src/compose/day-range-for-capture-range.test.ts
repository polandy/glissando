import { describe, expect, it } from "vitest";
import { dayRangeForCaptureRange } from "./day-range-for-capture-range";

describe("dayRangeForCaptureRange", () => {
  it("ranges across days within the same month in English", () => {
    expect(dayRangeForCaptureRange(["2025-07-12T10:00:00Z", "2025-07-28T10:00:00Z"], "en")).toBe(
      "July 12 – 28, 2025",
    );
  });

  it("names a single capture day in English", () => {
    expect(dayRangeForCaptureRange(["2025-07-20T10:00:00Z"], "en")).toBe("July 20, 2025");
  });

  it("ranges across months within the same year in German", () => {
    expect(dayRangeForCaptureRange(["2025-06-28T10:00:00Z", "2025-07-02T10:00:00Z"], "de")).toBe(
      "28. Juni – 2. Juli 2025",
    );
  });

  it("ranges across a year boundary in German", () => {
    expect(dayRangeForCaptureRange(["2024-12-31T10:00:00Z", "2025-01-01T10:00:00Z"], "de")).toBe(
      "31. Dezember 2024 – 1. Januar 2025",
    );
  });

  it("ignores the order of the given dates", () => {
    expect(dayRangeForCaptureRange(["2025-07-28T10:00:00Z", "2025-07-12T10:00:00Z"], "en")).toBe(
      "July 12 – 28, 2025",
    );
  });

  it("throws on an empty list", () => {
    expect(() => dayRangeForCaptureRange([], "en")).toThrow(RangeError);
  });
});
