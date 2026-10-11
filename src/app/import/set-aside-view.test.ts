import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../../library/stored-slideshow";
import { byCaptureTime, latestCaptured } from "./set-aside-view";

const picture = (id: string, capturedAt: string): StoredPicture => ({
  id,
  capturedAt,
  width: 4,
  height: 3,
  fileName: `${id}.jpg`,
});

const NOON = picture("noon", "2026-07-01T12:00:00Z");
const MORNING = picture("morning", "2026-07-01T08:00:00Z");
const EVENING = picture("evening", "2026-07-01T19:00:00Z");

describe("byCaptureTime", () => {
  it("orders the kept picture and the set-aside ones from the earliest to the latest", () => {
    expect(byCaptureTime(NOON, [EVENING, MORNING]).map(({ id }) => id)).toEqual([
      "morning",
      "noon",
      "evening",
    ]);
  });

  it("orders only the set-aside pictures when the kept one was removed", () => {
    expect(byCaptureTime(undefined, [EVENING, MORNING]).map(({ id }) => id)).toEqual([
      "morning",
      "evening",
    ]);
  });
});

describe("latestCaptured", () => {
  it("is the picture captured last", () => {
    expect(latestCaptured([NOON, EVENING, MORNING])).toBe(EVENING);
  });

  it("is nothing for no pictures", () => {
    expect(latestCaptured([])).toBeUndefined();
  });
});
