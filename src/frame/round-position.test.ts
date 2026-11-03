import { describe, expect, it } from "vitest";
import { followShownPicture, pictureIndexAt } from "./round-position";

describe("pictureIndexAt", () => {
  it.each([
    [0, 0],
    [29.9, 0],
    [30, 1],
    [75, 2],
  ])("is on picture %# at %f s with 30 s per picture", (seconds, index) => {
    expect(pictureIndexAt(seconds, 30_000, 4)).toBe(index);
  });

  it("stays on the last picture at the round's end", () => {
    expect(pictureIndexAt(120, 30_000, 4)).toBe(3);
  });
});

describe("followShownPicture", () => {
  /** A player whose clock the case sets; each `advanceTo` reports it the way playback does. */
  function fakePlayback() {
    const playback = Object.assign(new EventTarget(), { currentTime: 0 });
    const advanceTo = (seconds: number) => {
      playback.currentTime = seconds;
      playback.dispatchEvent(new Event("timeupdate"));
    };
    return { playback, advanceTo };
  }

  it("reports each picture once, as the playback reaches it", () => {
    const { playback, advanceTo } = fakePlayback();
    const shown: number[] = [];
    followShownPicture(playback, 10_000, 3, (index) => shown.push(index));

    [0, 5, 10, 12, 20, 30].forEach(advanceTo);

    expect(shown).toEqual([1, 2]);
  });
});
