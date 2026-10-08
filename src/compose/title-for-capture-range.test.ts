import { describe, expect, it } from "vitest";
import { titleForCaptureRange } from "./title-for-capture-range";

describe("titleForCaptureRange", () => {
  it("titles a single month in English", () => {
    expect(titleForCaptureRange(["2025-07-01T10:00:00Z", "2025-07-20T10:00:00Z"], "en")).toBe(
      "July 2025",
    );
  });

  it("titles a single month in German", () => {
    expect(titleForCaptureRange(["2025-07-01T10:00:00Z"], "de")).toBe("Juli 2025");
  });

  it("titles a range across months within the same year in German", () => {
    expect(titleForCaptureRange(["2025-06-01T10:00:00Z", "2025-08-20T10:00:00Z"], "de")).toBe(
      "Juni–August 2025",
    );
  });

  it("titles a range across a year boundary in German", () => {
    expect(titleForCaptureRange(["2024-12-01T10:00:00Z", "2025-01-20T10:00:00Z"], "de")).toBe(
      "Dezember 2024 – Januar 2025",
    );
  });

  it("ignores the order of the given dates", () => {
    expect(titleForCaptureRange(["2025-08-20T10:00:00Z", "2025-06-01T10:00:00Z"], "de")).toBe(
      "Juni–August 2025",
    );
  });

  it("throws on an empty list", () => {
    expect(() => titleForCaptureRange([], "en")).toThrow(RangeError);
  });
});
