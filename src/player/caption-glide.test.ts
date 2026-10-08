import { describe, expect, it } from "vitest";
import { CAPTION_GLIDE_MS, CaptionGlide, cssEase } from "./caption-glide";

describe("cssEase", () => {
  it("starts at 0 and ends at 1", () => {
    expect(cssEase(0)).toBe(0);
    expect(cssEase(1)).toBe(1);
  });

  it("follows CSS `ease` (cubic-bezier(0.25, 0.1, 0.25, 1)): fast start, slow end", () => {
    expect(cssEase(0.25)).toBeCloseTo(0.4085, 3);
    expect(cssEase(0.5)).toBeCloseTo(0.8024, 3);
    expect(cssEase(0.75)).toBeCloseTo(0.9604, 3);
  });

  it("clamps progress outside 0..1", () => {
    expect(cssEase(-0.5)).toBe(0);
    expect(cssEase(1.5)).toBe(1);
  });
});

describe("CaptionGlide", () => {
  it("starts settled at 0", () => {
    const glide = new CaptionGlide();

    expect(glide.target).toBe(0);
    expect(glide.valueAt(0)).toBe(0);
    expect(glide.isGlidingAt(0)).toBe(false);
  });

  it("glides to a new target over CAPTION_GLIDE_MS with CSS ease", () => {
    const glide = new CaptionGlide();

    glide.glideTo(100, 1000);

    expect(glide.target).toBe(100);
    expect(glide.valueAt(1000)).toBe(0);
    expect(glide.valueAt(1000 + CAPTION_GLIDE_MS / 2)).toBeCloseTo(100 * cssEase(0.5), 10);
    expect(glide.isGlidingAt(1000 + CAPTION_GLIDE_MS - 1)).toBe(true);
    expect(glide.valueAt(1000 + CAPTION_GLIDE_MS)).toBe(100);
    expect(glide.isGlidingAt(1000 + CAPTION_GLIDE_MS)).toBe(false);
  });

  it("turns mid-glide from where the caption is, without a jump", () => {
    const glide = new CaptionGlide();
    glide.glideTo(100, 0);
    const halfway = glide.valueAt(CAPTION_GLIDE_MS / 2);

    glide.glideTo(0, CAPTION_GLIDE_MS / 2);

    expect(glide.valueAt(CAPTION_GLIDE_MS / 2)).toBe(halfway);
    expect(glide.valueAt(CAPTION_GLIDE_MS / 2 + CAPTION_GLIDE_MS)).toBe(0);
  });

  it("jumps to a target at once, ending any glide", () => {
    const glide = new CaptionGlide();
    glide.glideTo(100, 0);

    glide.jumpTo(40);

    expect(glide.valueAt(1)).toBe(40);
    expect(glide.isGlidingAt(1)).toBe(false);
  });

  it("does not glide to the target it already rests at", () => {
    const glide = new CaptionGlide();
    glide.jumpTo(40);

    glide.glideTo(40, 0);

    expect(glide.isGlidingAt(0)).toBe(false);
  });
});
