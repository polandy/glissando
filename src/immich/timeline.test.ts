import { describe, expect, it } from "vitest";
import { monthEnd } from "./timeline";

describe("monthEnd", () => {
  it.each([
    ["2025-07", "2025-08-01T00:00:00.000Z"],
    ["2025-12", "2026-01-01T00:00:00.000Z"],
    ["2024-02", "2024-03-01T00:00:00.000Z"],
    ["0999-12", "1000-01-01T00:00:00.000Z"],
  ])("ends %s at %s", (month, instant) => {
    expect(monthEnd(month)).toBe(instant);
  });

  it.each(["2025-13", "2025-00", "2025-7", "2025-07-01", ""])("rejects %j", (month) => {
    expect(() => monthEnd(month)).toThrow(/YYYY-MM/);
  });
});
