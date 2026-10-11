import { describe, expect, it } from "vitest";
import { parseMusicBeats } from "./music-beats-json";

describe("parseMusicBeats", () => {
  it("reads a track with no clear beat", () => {
    expect(parseMusicBeats({ kind: "none" })).toEqual({ kind: "none" });
  });

  it("reads a track's beats and tempo", () => {
    const value = { kind: "beats", beatsMs: [0, 500, 1000], beatsPerMinute: 120 };
    expect(parseMusicBeats(value)).toEqual(value);
  });

  it("refuses a field it does not know, as the server documents do", () => {
    const valid = { kind: "beats", beatsMs: [0, 500], beatsPerMinute: 120 };
    expect(parseMusicBeats(valid)).toEqual(valid);

    expect(parseMusicBeats({ ...valid, extra: "unknown" })).toBeUndefined();
    expect(parseMusicBeats({ kind: "none", extra: "unknown" })).toBeUndefined();
  });

  it.each([
    ["not an object", 42],
    ["null", null],
    ["an unknown kind", { kind: "maybe" }],
    ["beats without beatsMs", { kind: "beats", beatsPerMinute: 120 }],
    ["beats without beatsPerMinute", { kind: "beats", beatsMs: [0, 500] }],
    ["a beatsMs that is not an array", { kind: "beats", beatsMs: "0,500", beatsPerMinute: 120 }],
    ["a negative beat time", { kind: "beats", beatsMs: [-1, 500], beatsPerMinute: 120 }],
    ["a non-integer beat time", { kind: "beats", beatsMs: [0, 500.5], beatsPerMinute: 120 }],
    [
      "a beat time past Number.MAX_SAFE_INTEGER",
      { kind: "beats", beatsMs: [0, Number.MAX_SAFE_INTEGER + 2], beatsPerMinute: 120 },
    ],
    [
      "beats not strictly ascending",
      { kind: "beats", beatsMs: [0, 500, 500], beatsPerMinute: 120 },
    ],
    ["beats out of order", { kind: "beats", beatsMs: [500, 0, 1000], beatsPerMinute: 120 }],
    ["a NaN beat time", { kind: "beats", beatsMs: [0, Number.NaN], beatsPerMinute: 120 }],
    ["a zero tempo", { kind: "beats", beatsMs: [0, 500], beatsPerMinute: 0 }],
    ["a negative tempo", { kind: "beats", beatsMs: [0, 500], beatsPerMinute: -10 }],
    [
      "an infinite tempo",
      { kind: "beats", beatsMs: [0, 500], beatsPerMinute: Number.POSITIVE_INFINITY },
    ],
    ["a NaN tempo", { kind: "beats", beatsMs: [0, 500], beatsPerMinute: Number.NaN }],
  ])("rejects %s", (_name, value) => {
    expect(parseMusicBeats(value)).toBeUndefined();
  });
});
