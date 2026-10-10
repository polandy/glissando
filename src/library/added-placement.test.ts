import { describe, expect, it } from "vitest";
import { placeByCaptureDate } from "./added-placement";
import type { StoredPicture } from "./stored-slideshow";

function at(id: string, capturedAt: string): StoredPicture {
  return { id, capturedAt, width: 100, height: 100, fileName: `${id}.jpg` };
}

const ids = (pictures: readonly StoredPicture[]) => pictures.map(({ id }) => id);

/** An own order: the sunset of 8 July moved to the front. */
const ownOrder = [
  at("sunset", "2025-07-08T19:40:00Z"),
  at("arrival", "2025-07-02T10:00:00Z"),
  at("lake", "2025-07-03T10:00:00Z"),
  at("departure", "2025-07-09T10:00:00Z"),
];

describe("placeByCaptureDate", () => {
  it.each([
    {
      rule: "goes right after the picture taken last before it",
      added: [at("ferry", "2025-07-03T12:00:00Z")],
      expected: ["sunset", "arrival", "lake", "ferry", "departure"],
    },
    {
      rule: "follows that picture wherever the own order put it",
      added: [at("evening", "2025-07-08T21:00:00Z")],
      expected: ["sunset", "evening", "arrival", "lake", "departure"],
    },
    {
      rule: "goes after a picture taken at the same time",
      added: [at("same", "2025-07-03T10:00:00Z")],
      expected: ["sunset", "arrival", "lake", "same", "departure"],
    },
    {
      rule: "goes right before the oldest picture when older than all",
      added: [at("eve", "2025-07-01T18:00:00Z")],
      expected: ["sunset", "eve", "arrival", "lake", "departure"],
    },
    {
      rule: "keeps several at one spot in capture order",
      added: [at("late", "2025-07-03T18:00:00Z"), at("early", "2025-07-03T11:00:00Z")],
      expected: ["sunset", "arrival", "lake", "early", "late", "departure"],
    },
    {
      rule: "puts one going after a picture before one going before the next",
      added: [at("eve", "2025-07-01T18:00:00Z"), at("evening", "2025-07-08T21:00:00Z")],
      expected: ["sunset", "evening", "eve", "arrival", "lake", "departure"],
    },
  ])("a new picture $rule", ({ added, expected }) => {
    expect(ids(placeByCaptureDate(ownOrder, added))).toEqual(expected);
  });

  it("goes after the later one in play order of pictures taken at the same time", () => {
    const twins = [
      at("first", "2025-07-02T10:00:00Z"),
      at("other", "2025-07-05T10:00:00Z"),
      at("second", "2025-07-02T10:00:00Z"),
    ];

    const placed = placeByCaptureDate(twins, [at("new", "2025-07-03T10:00:00Z")]);

    expect(ids(placed)).toEqual(["first", "other", "second", "new"]);
  });

  it("orders new pictures by capture date when there are none to place them by", () => {
    const placed = placeByCaptureDate(
      [],
      [at("late", "2025-07-03T18:00:00Z"), at("early", "2025-07-03T11:00:00Z")],
    );

    expect(ids(placed)).toEqual(["early", "late"]);
  });

  it("leaves the pictures already there in their own order", () => {
    const placed = placeByCaptureDate(ownOrder, [at("ferry", "2025-07-03T12:00:00Z")]);

    expect(ids(placed.filter(({ id }) => id !== "ferry"))).toEqual(ids(ownOrder));
  });
});
