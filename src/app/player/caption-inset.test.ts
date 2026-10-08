import { describe, expect, it } from "vitest";
import { captionInset, captionInsetMotion } from "./caption-inset";

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

describe("captionInsetMotion", () => {
  it("glides the caption along with the controls", () => {
    expect(captionInsetMotion({ firstPlacement: false, reducedMotion: false })).toBe("glide");
  });

  it("places the caption at once when the player opens, so it does not slide in", () => {
    expect(captionInsetMotion({ firstPlacement: true, reducedMotion: false })).toBe("jump");
  });

  it("moves the caption at once when the viewer prefers reduced motion", () => {
    expect(captionInsetMotion({ firstPlacement: false, reducedMotion: true })).toBe("jump");
  });
});
