import { describe, expect, it } from "vitest";
import { preselectedPageSize, sizesBarelyDiffer } from "./size-note";

describe("sizesBarelyDiffer", () => {
  it("holds for equal estimates", () => {
    expect(sizesBarelyDiffer([12_000_000, 12_000_000, 12_000_000])).toBe(true);
  });

  it("holds when the largest is at most five percent above the smallest", () => {
    expect(sizesBarelyDiffer([100, 103, 105])).toBe(true);
  });

  it("does not hold beyond five percent", () => {
    expect(sizesBarelyDiffer([100, 103, 106])).toBe(false);
  });

  it("does not hold for sizes that are not known", () => {
    expect(sizesBarelyDiffer([])).toBe(false);
    expect(sizesBarelyDiffer([0, 0, 0])).toBe(false);
  });
});

describe("preselectedPageSize", () => {
  it("moves to Standard when the sizes barely differ and nothing was chosen yet", () => {
    expect(preselectedPageSize("small", true, false)).toBe("sharp");
  });

  it("keeps the user's choice", () => {
    expect(preselectedPageSize("small", true, true)).toBe("small");
  });

  it("keeps the size when the sizes differ", () => {
    expect(preselectedPageSize("small", false, false)).toBe("small");
  });
});
