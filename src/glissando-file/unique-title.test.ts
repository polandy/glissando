import { describe, expect, it } from "vitest";
import { uniqueTitle } from "./unique-title";

describe("uniqueTitle", () => {
  it.each([
    ["Herbst in Wien", [], "Herbst in Wien"],
    ["Sommer am See", ["Sommer am See"], "Sommer am See (2)"],
    ["Sommer am See", ["Sommer am See", "Sommer am See (2)"], "Sommer am See (3)"],
    ["Sommer am See", ["Sommer am See (2)"], "Sommer am See"],
  ])("makes %j unique among %j as %j", (title, existing, expected) => {
    expect(uniqueTitle(title, existing)).toBe(expected);
  });
});
