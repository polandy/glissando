import { describe, expect, it } from "vitest";
import { captionInset } from "./caption-inset";

describe("captionInset", () => {
  it("lifts the caption above the controls while they show, not above their fade", () => {
    expect(captionInset(true, { height: 150, fadeHeight: 40 })).toBe(110);
  });

  it("leaves the caption at the bottom while the controls are hidden", () => {
    expect(captionInset(false, { height: 150, fadeHeight: 40 })).toBe(0);
  });

  it("never lowers the caption below the bottom", () => {
    expect(captionInset(true, { height: 0, fadeHeight: 40 })).toBe(0);
  });
});
