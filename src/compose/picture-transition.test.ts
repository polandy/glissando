import { describe, expect, it } from "vitest";
import { automaticTransition, pictureTransition } from "./picture-transition";
import { autoTransitionEffect } from "./auto-transition";
import type { StoredPicture } from "../library/stored-slideshow";

const automatic: StoredPicture = {
  id: "p",
  capturedAt: "2025-07-01T10:00:00Z",
  width: 100,
  height: 100,
  fileName: "p.jpg",
};

describe("automaticTransition", () => {
  it.each([0, 1, 4])("is the slideshow's default effect at every position (%i)", (index) => {
    expect(automaticTransition(index, "zoom-in")).toBe("zoom-in");
  });

  it("cycles the effects by position when the slideshow alternates", () => {
    expect([0, 1, 2].map((index) => automaticTransition(index, "alternate"))).toEqual(
      [0, 1, 2].map(autoTransitionEffect),
    );
  });

  it("is the cut when the slideshow cuts", () => {
    expect(automaticTransition(1, "cut")).toBe("cut");
  });
});

describe("pictureTransition", () => {
  it("plays the slideshow's default while the picture has none of its own", () => {
    expect(pictureTransition(1, 3, automatic, 5000, "crossfade")).toEqual({
      effect: "crossfade",
      durationMs: 1000,
    });
    expect(pictureTransition(1, 3, automatic, 5000, "circle-open")).toEqual({
      effect: "circle-open",
      durationMs: 1000,
    });
  });

  it("plays the effect for the position while the slideshow alternates", () => {
    expect(pictureTransition(1, 3, automatic, 5000, "alternate")).toEqual({
      effect: autoTransitionEffect(1),
      durationMs: 1000,
    });
  });

  it("has no transition while the slideshow cuts and the picture has none of its own", () => {
    expect(pictureTransition(0, 3, automatic, 5000, "cut")).toBeUndefined();
  });

  it("plays the picture's own effect over the slideshow's default", () => {
    expect(pictureTransition(0, 3, { ...automatic, transition: "crossfade" }, 5000, "cut")).toEqual(
      { effect: "crossfade", durationMs: 1000 },
    );
  });

  it("plays the picture's own effect, at the length its duration gives", () => {
    expect(
      pictureTransition(1, 3, { ...automatic, transition: "dissolve" }, 2000, "crossfade"),
    ).toEqual({
      effect: "dissolve",
      durationMs: 600,
    });
  });

  it("has no transition for a cut: the next picture follows at once", () => {
    expect(
      pictureTransition(0, 3, { ...automatic, transition: "cut" }, 5000, "crossfade"),
    ).toBeUndefined();
  });

  it("has no transition on the last slide, even with an own one stored", () => {
    expect(pictureTransition(2, 3, automatic, 5000, "crossfade")).toBeUndefined();
    expect(
      pictureTransition(2, 3, { ...automatic, transition: "push-left" }, 5000, "crossfade"),
    ).toBeUndefined();
  });
});
