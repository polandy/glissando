import { describe, expect, it } from "vitest";
import { TEXTURE_UNITS } from "./texture-units";

describe("TEXTURE_UNITS", () => {
  it("gives every sampler its own unit", () => {
    const units = [...Object.values(TEXTURE_UNITS.from), ...Object.values(TEXTURE_UNITS.to)];
    expect(new Set(units).size).toBe(units.length);
  });

  it("keeps the item pass on the unit the from-card sampler uses", () => {
    expect(TEXTURE_UNITS.cardItem).toBe(TEXTURE_UNITS.from.card);
  });
});
