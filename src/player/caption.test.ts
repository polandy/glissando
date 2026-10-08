import { describe, expect, it } from "vitest";
import { captionLength, isCaption, MAX_CAPTION_LENGTH, normalizeCaption } from "./caption";

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

  it("keeps at most 80 characters, counted as code points", () => {
    const typed = "🌅".repeat(MAX_CAPTION_LENGTH + 5);

    expect(normalizeCaption(typed)).toBe("🌅".repeat(80));
  });

  it("trims a space the cut leaves at the end", () => {
    const typed = `${"a".repeat(79)} b`;

    expect(normalizeCaption(typed)).toBe("a".repeat(79));
  });
});

describe("isCaption", () => {
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
  ])("rejects %s", (_, value) => {
    expect(isCaption(value)).toBe(false);
  });
});

describe("captionLength", () => {
  it("counts code points, so an emoji is one character as in the limit", () => {
    expect(captionLength("Steg 🌅")).toBe(6);
  });
});
