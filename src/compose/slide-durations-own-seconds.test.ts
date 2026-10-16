import { describe, expect, it } from "vitest";
import { slideDurationsMs } from "./slide-durations-ms";

const automatic = (count: number) => Array.from({ length: count }, () => ({}));
const sum = (durations: readonly number[]) => durations.reduce((total, ms) => total + ms, 0);
/** Beats every `periodMs` from `firstMs` up to `untilMs`, in ms of the excerpt. */
const beatsEvery = (periodMs: number, firstMs: number, untilMs: number) =>
  Array.from(
    { length: Math.floor((untilMs - firstMs) / periodMs) + 1 },
    (_, n) => firstMs + n * periodMs,
  );

describe("slideDurationsMs with music the pictures do not fill", () => {
  it("gives each automatic picture exactly secondsPerPicture without beats to change on", () => {
    expect(slideDurationsMs(automatic(3), undefined, 4.5)).toEqual([4500, 4500, 4500]);
  });

  it("moves each change to the beat nearest where it would fall, so the shifts do not add up", () => {
    // Without beats the changes fall at 5000, 10 000 and 15 000; the nearest beats are 4900,
    // 9800 and 14 700, each 100 ms further from the last but none more than one beat away.
    const durations = slideDurationsMs(automatic(4), undefined, 5, beatsEvery(700, 0, 60_000));

    expect(durations.slice(0, 3)).toEqual([4900, 4900, 4900]);
  });

  it("moves the slideshow's end to the nearest beat too, a phrase start when about as near", () => {
    // Without beats the slideshow ends at 20 000; the nearest beat is 20 300, the phrase start at
    // 19 600 is 400 ms away, less than half a beat further.
    const durations = slideDurationsMs(automatic(4), undefined, 5, beatsEvery(700, 0, 60_000));

    expect(durations).toEqual([4900, 4900, 4900, 4900]);
    expect(sum(durations)).toBe(19_600);
  });

  it("keeps the end where it falls when no beat is near it, as past the music's end", () => {
    // The last beat is at 4900; the end at 10 000 has none within the last slide's slack.
    expect(slideDurationsMs(automatic(2), undefined, 5, [4900])).toEqual([4900, 5100]);
  });

  it("keeps own durations exact after the last automatic picture, which ends on the beat", () => {
    const pictures = [{}, {}, { durationMs: 3000 }];

    expect(slideDurationsMs(pictures, undefined, 5, [4900, 9700])).toEqual([4900, 4800, 3000]);
  });
});
