import { describe, expect, it } from "vitest";
import { lookFilterValues } from "./look-filter";

describe("lookFilterValues: none", () => {
  it("is null — the DOM fallback applies no filter", () => {
    expect(lookFilterValues("none")).toBeNull();
  });
});

describe("lookFilterValues: warm", () => {
  it("is feColorMatrix's 4x5 values, row-major, offsets in the fifth column", () => {
    const values = lookFilterValues("warm");
    expect(values).not.toBeNull();
    expect(values?.colorMatrixValues).toBe(
      ["1.08 0.02 0 0 0.015", "0.01 1.01 0 0 0.008", "0 0 0.86 0 0", "0 0 0 1 0"].join(" "),
    );
  });

  it("is feComponentTransfer's per-channel tableValues", () => {
    const values = lookFilterValues("warm");
    expect(values?.tableValues.r).toBe("0 0.27 0.53 0.78 1");
    expect(values?.tableValues.g).toBe("0 0.25 0.51 0.76 0.98");
    expect(values?.tableValues.b).toBe("0 0.23 0.47 0.72 0.94");
  });
});

describe("lookFilterValues: a computed look", () => {
  it("rounds float noise out of a saturation matrix's values", () => {
    const values = lookFilterValues("vivid");
    // S(1.35) row 0, column 0: (1 - 1.35) * 0.2126 + 1.35 = 1.27559.
    const firstNumber = values?.colorMatrixValues.split(" ")[0];
    expect(Number(firstNumber)).toBeCloseTo(1.27559, 6);
    // No value should carry more than 6 decimal places of float noise.
    for (const token of values?.colorMatrixValues.split(" ") ?? []) {
      const decimals = token.split(".")[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(6);
    }
  });
});
