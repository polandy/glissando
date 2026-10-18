import { describe, expect, it } from "vitest";
import {
  neighbourAfterRemoval,
  stepFrom,
  viewerEntries,
  type SetAsideReason,
  type ViewerPicture,
} from "./picture-viewer-view";

const picture = (id: string): ViewerPicture => ({ id, capturedAt: "2026-07-01T12:00:00Z" });

const GROUPS: readonly { kind: SetAsideReason; pictures: readonly ViewerPicture[] }[] = [
  { kind: "similar", pictures: [picture("s1"), picture("s2")] },
  { kind: "blurry", pictures: [picture("b1")] },
];

describe("viewerEntries", () => {
  it("lists the strip's pictures first, then the set-aside ones group by group with their reason", () => {
    const entries = viewerEntries([picture("a"), picture("c")], GROUPS);

    expect(entries.map(({ picture: { id }, setAside }) => [id, setAside])).toEqual([
      ["a", null],
      ["c", null],
      ["s1", "similar"],
      ["s2", "similar"],
      ["b1", "blurry"],
    ]);
  });

  it("lists only the strip's pictures when nothing is set aside", () => {
    expect(viewerEntries([picture("a")], []).map(({ picture: { id } }) => id)).toEqual(["a"]);
  });
});

describe("stepFrom", () => {
  const entries = viewerEntries([picture("a"), picture("c")], GROUPS);

  it.each([
    ["a", 1, "c"],
    ["c", -1, "a"],
    ["c", 1, "s1"],
    ["b1", -1, "s2"],
  ])("from %s by %i is %s", (from, delta, expected) => {
    expect(stepFrom(entries, from, delta)).toBe(expected);
  });

  it.each([
    ["a", -1],
    ["b1", 1],
  ])("stays put past the end: from %s by %i", (from, delta) => {
    expect(stepFrom(entries, from, delta)).toBeNull();
  });
});

describe("neighbourAfterRemoval", () => {
  const entries = viewerEntries([picture("a"), picture("c"), picture("d")], []);

  it("is the picture that takes the removed one's place", () => {
    expect(neighbourAfterRemoval(entries, "c")).toBe("d");
  });

  it("is the previous picture when the last one is removed", () => {
    expect(neighbourAfterRemoval(entries, "d")).toBe("c");
  });

  it("is nothing when the only picture is removed", () => {
    expect(neighbourAfterRemoval(viewerEntries([picture("a")], []), "a")).toBeNull();
  });
});
