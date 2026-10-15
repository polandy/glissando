import { describe, expect, it } from "vitest";
import { itemCount, letters, words } from "./card-items";
import type { Card } from "./slideshow";

function card(overrides: Partial<Card>): Pick<Card, "title" | "subtitle" | "entrance"> {
  return { title: "Summer Lake", entrance: "rise", ...overrides };
}

describe("words", () => {
  it("splits on spaces, keeping each word as one item", () => {
    expect(words("Summer at the Lake")).toEqual(["Summer", "at", "the", "Lake"]);
  });

  it("does not turn a space into its own item", () => {
    expect(words("a b")).toEqual(["a", "b"]);
  });

  it("drops punctuation-only segments", () => {
    expect(words("Lake Garda, 2026")).toEqual(["Lake", "Garda", "2026"]);
  });
});

describe("letters", () => {
  it("splits into graphemes", () => {
    expect(letters("Lake")).toEqual(["L", "a", "k", "e"]);
  });

  it("does not turn a space into its own item", () => {
    expect(letters("a b")).toEqual(["a", "b"]);
  });

  it("keeps a combining-mark grapheme as a single item", () => {
    expect(letters("é")).toEqual(["é"]);
  });
});

describe("itemCount", () => {
  it("is 1 for a whole-text entrance (rise, focus, slow-fade)", () => {
    expect(itemCount(card({ entrance: "rise" }))).toBe(1);
    expect(itemCount(card({ entrance: "focus" }))).toBe(1);
    expect(itemCount(card({ entrance: "slow-fade" }))).toBe(1);
  });

  it("counts every word of the title and the subtitle for words", () => {
    expect(
      itemCount(card({ title: "Summer Lake", subtitle: "June 2026", entrance: "words" })),
    ).toBe(4);
  });

  it("counts every grapheme of the title and the subtitle for letters, spaces excluded", () => {
    expect(itemCount(card({ title: "ab cd", entrance: "letters" }))).toBe(4);
  });

  it("counts the title alone when there is no subtitle", () => {
    expect(itemCount(card({ title: "Summer Lake", entrance: "words" }))).toBe(2);
  });
});
