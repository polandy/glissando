import { describe, expect, it } from "vitest";
import { groupByDay } from "./photo-days";
import { photo } from "./testing/fake-immich-client";

describe("groupByDay", () => {
  it("has no days for no photos", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("groups consecutive photos of one day, keeping their order", () => {
    const evening = photo("evening", "2025-07-12T21:00:00.000Z");
    const morning = photo("morning", "2025-07-12T07:00:00.000Z");
    const dayBefore = photo("day-before", "2025-07-11T12:00:00.000Z");

    expect(groupByDay([evening, morning, dayBefore])).toEqual([
      { day: "2025-07-12", photos: [evening, morning], hidden: 0 },
      { day: "2025-07-11", photos: [dayBefore], hidden: 0 },
    ]);
  });

  it("merges a later page that continues the same day into the last group", () => {
    const firstPage = [
      photo("a", "2025-07-13T10:00:00.000Z"),
      photo("b", "2025-07-12T22:00:00.000Z"),
    ];
    const secondPage = [
      photo("c", "2025-07-12T08:00:00.000Z"),
      photo("d", "2025-07-10T08:00:00.000Z"),
    ];

    const days = groupByDay([...firstPage, ...secondPage]);

    expect(days.map(({ day, photos }) => [day, photos.map(({ id }) => id)])).toEqual([
      ["2025-07-13", ["a"]],
      ["2025-07-12", ["b", "c"]],
      ["2025-07-10", ["d"]],
    ]);
  });

  it("counts the hidden assets on the day of their wall time", () => {
    const kept = photo("kept", "2025-07-12T21:00:00.000Z");
    const other = photo("other", "2025-07-11T12:00:00.000Z");
    const hiddenTakenAt = ["2025-07-12T08:00:00Z", "2025-07-12T23:59:59Z", "2025-07-11T10:00:00Z"];

    const days = groupByDay([kept, other], hiddenTakenAt);

    expect(days.map(({ day, hidden }) => [day, hidden])).toEqual([
      ["2025-07-12", 2],
      ["2025-07-11", 1],
    ]);
  });

  it("gives no group to a day whose assets are all hidden", () => {
    const days = groupByDay([photo("kept", "2025-07-12T21:00:00.000Z")], ["2025-07-01T08:00:00Z"]);

    expect(days.map(({ day }) => day)).toEqual(["2025-07-12"]);
  });

  it("takes the day from the wall time, never shifting it by a time zone", () => {
    expect(groupByDay([photo("late", "2025-07-12T23:59:59.000Z")])[0]?.day).toBe("2025-07-12");
  });
});
