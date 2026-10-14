import { describe, expect, it } from "vitest";
import { CARD_DEFAULT_TINT, CARD_SWATCHES, inkFor } from "./card-palette";

describe("CARD_SWATCHES", () => {
  it("names plum as the default tint", () => {
    expect(CARD_SWATCHES.plum).toBe(CARD_DEFAULT_TINT);
  });

  it.each([
    ["plum", "#2A2340"],
    ["night", "#14111C"],
    ["cream", "#FFF3E2"],
    ["peach", "#FFB59A"],
    ["mint", "#8FD9C4"],
    ["lemon", "#FFD95A"],
  ] as const)("maps %s to %s", (id, hex) => {
    expect(CARD_SWATCHES[id]).toBe(hex);
  });
});

describe("inkFor", () => {
  it.each([
    ["black, the darkest ground", "#000000", "light"],
    ["plum, a dark tint", "#2A2340", "light"],
    ["cream, a light tint", "#FFF3E2", "dark"],
    ["white, the lightest ground", "#FFFFFF", "dark"],
    ["lemon, a bright mid tint", "#FFD95A", "dark"],
  ] as const)("picks %s ink for %s", (_case, hex, ink) => {
    expect(inkFor(hex)).toBe(ink);
  });
});
