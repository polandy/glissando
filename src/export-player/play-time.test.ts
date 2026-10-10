import { describe, expect, it } from "vitest";
import { formatPlayTime } from "./play-time";

describe("formatPlayTime", () => {
  it.each([
    [0, "0:00"],
    [12.9, "0:12"],
    [250, "4:10"],
    [3723, "1:02:03"],
  ])("shows %f s as %s, whole seconds rounded down", (seconds, shown) => {
    expect(formatPlayTime(seconds)).toBe(shown);
  });

  it("shows a negative or not-a-number time as 0:00", () => {
    expect(formatPlayTime(-1)).toBe("0:00");
    expect(formatPlayTime(Number.NaN)).toBe("0:00");
  });
});
