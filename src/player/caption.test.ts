import { describe, expect, it } from "vitest";
import {
  captionLength,
  isCaption,
  MAX_CAPTION_LENGTH,
  normalizeCaption,
  withinCaptionLimit,
} from "./caption";

/** One grapheme each, but several code points: a ZWJ sequence, a flag, a combining mark. */
const FAMILY = "👨‍👩‍👧";
const FLAG = "🇨🇭";
const E_ACUTE = "e\u0301";

describe("normalizeCaption", () => {
  it.each([
    ["Evening on the jetty", "Evening on the jetty"],
    ["  Evening on the jetty  ", "Evening on the jetty"],
    ["Evening\non\tthe   jetty", "Evening on the jetty"],
    ["Evening\r\n\r\non the jetty", "Evening on the jetty"],
  ])("collapses every whitespace run to one space and trims: %j", (typed, normal) => {
    expect(normalizeCaption(typed)).toBe(normal);
  });

  it.each(["", "   ", "\n\t "])("makes a caption of only whitespace absent: %j", (typed) => {
    expect(normalizeCaption(typed)).toBeUndefined();
  });

  it("keeps at most 80 characters, an emoji counting as one", () => {
    const typed = "🌅".repeat(MAX_CAPTION_LENGTH + 5);

    expect(normalizeCaption(typed)).toBe("🌅".repeat(80));
  });

  it.each([
    ["a ZWJ family emoji", FAMILY],
    ["a flag", FLAG],
    ["a letter with a combining mark", E_ACUTE],
  ])("cuts between whole graphemes, never inside %s", (_, grapheme) => {
    const typed = grapheme.repeat(MAX_CAPTION_LENGTH + 5);

    expect(normalizeCaption(typed)).toBe(grapheme.repeat(MAX_CAPTION_LENGTH));
  });

  it("trims a space the cut leaves at the end", () => {
    const typed = `${"a".repeat(79)} b`;

    expect(normalizeCaption(typed)).toBe("a".repeat(79));
  });
});

describe("isCaption", () => {
  it("accepts 80 graphemes of several code points each", () => {
    expect(isCaption(FAMILY.repeat(MAX_CAPTION_LENGTH))).toBe(true);
  });

  it.each(["Evening on the jetty", "🌅".repeat(80), "Ä"])(
    "accepts a normal caption: %j",
    (value) => {
      expect(isCaption(value)).toBe(true);
    },
  );

  it.each([
    ["an empty string", ""],
    ["a number", 7],
    ["a multi-line string", "Evening\non the jetty"],
    ["leading whitespace", " Evening"],
    ["repeated spaces", "Evening  on the jetty"],
    ["81 characters", "a".repeat(81)],
    ["81 graphemes", FLAG.repeat(81)],
  ])("rejects %s", (_, value) => {
    expect(isCaption(value)).toBe(false);
  });
});

describe("captionLength", () => {
  it("counts graphemes, so an emoji is one character as in the limit", () => {
    expect(captionLength("Steg 🌅")).toBe(6);
  });

  it("counts a ZWJ emoji, a flag and a combining mark as one character each", () => {
    expect(captionLength(`${FAMILY}${FLAG}${E_ACUTE}`)).toBe(3);
  });
});

describe("withinCaptionLimit", () => {
  it("keeps text within the limit exactly as it is, whitespace too", () => {
    expect(withinCaptionLimit("  Steg  🌅 ")).toBe("  Steg  🌅 ");
  });

  it("cuts longer text after 80 graphemes", () => {
    expect(withinCaptionLimit(FAMILY.repeat(MAX_CAPTION_LENGTH + 1))).toBe(
      FAMILY.repeat(MAX_CAPTION_LENGTH),
    );
  });
});
