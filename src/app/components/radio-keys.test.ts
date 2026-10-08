import { describe, expect, it } from "vitest";
import { radioIndexForKey } from "./radio-keys";

describe("radioIndexForKey", () => {
  it.each<[string, number, number]>([
    ["ArrowDown", 0, 1],
    ["ArrowRight", 1, 2],
    ["ArrowDown", 2, 0],
    ["ArrowUp", 1, 0],
    ["ArrowLeft", 0, 2],
    ["Home", 2, 0],
    ["End", 0, 2],
  ])("moves with %s from option %i to option %i of three", (key, from, to) => {
    expect(radioIndexForKey(key, from, 3)).toBe(to);
  });

  it.each(["Tab", "Enter", " ", "a"])("leaves %j to the browser", (key) => {
    expect(radioIndexForKey(key, 1, 3)).toBeNull();
  });
});
