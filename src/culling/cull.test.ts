import { describe, expect, it } from "vitest";
import { cull, type CullCandidate } from "./cull";

const SHARP = 1000;
const BLURRY = 5;
/** Hashes 0 bits apart, 10 apart (still similar) and 11 apart (different). */
const SCENE = 0n;
const SCENE_TEN_BITS_OFF = 0x3ffn;
const SCENE_ELEVEN_BITS_OFF = 0x7ffn;
const OTHER_SCENE = 0xffff_0000_ffff_0000n;

function candidate(
  id: string,
  second: number,
  options: { sharpness?: number; hash?: bigint } = {},
): CullCandidate {
  const capturedAt = new Date(Date.UTC(2025, 6, 2, 14, 2, 0) + second * 1000).toISOString();
  return { id, capturedAt, sharpness: options.sharpness ?? SHARP, hash: options.hash ?? SCENE };
}

/** A slow pan: each step 8 bits from the one before, so the second is 16 bits from the first. */
const PAN_START = 0n;
const PAN_MIDDLE = 0xffn;
const PAN_END = 0xffffn;
/** 9 bits from SCENE but only 2 from SCENE_ELEVEN_BITS_OFF. */
const NEARER_ELEVEN_BITS_OFF = 0x1ffn;
/** 12 bits from SCENE, so another group; EQUALLY_NEAR is 6 bits from each. */
const SCENE_TWELVE_BITS_OFF = 0xfffn;
const EQUALLY_NEAR = 0x3fn;

/** Pictures far apart in time, so none joins a group: they only count for the median. */
function singles(count: number, sharpness = SHARP): CullCandidate[] {
  return Array.from({ length: count }, (_, index) =>
    candidate(`single-${index}`, 3600 * (index + 1), { sharpness, hash: OTHER_SCENE }),
  );
}

const reasons = (candidates: readonly CullCandidate[]) =>
  Object.fromEntries(cull(candidates).setAside);

describe("culling similar shots", () => {
  it("keeps the sharpest of similar shots taken within 2 minutes, the rest are similar", () => {
    const result = cull([
      candidate("a", 0, { sharpness: 240 }),
      candidate("b", 90, { sharpness: 455 }),
      candidate("c", 120, { sharpness: 120 }),
    ]);

    expect(Object.fromEntries(result.setAside)).toEqual({ a: "similar", c: "similar" });
    expect(result.similarGroups).toEqual([{ keptId: "b", similarIds: ["a", "c"] }]);
  });

  it("does not group the same scene taken more than 2 minutes after the group's first picture", () => {
    expect(reasons([candidate("a", 0), candidate("b", 100), candidate("c", 180)])).toEqual({
      b: "similar",
    });
  });

  it("measures the 2 minutes from the group's first picture, not chained from the one before", () => {
    expect(
      reasons([candidate("a", 0), candidate("b", 60), candidate("c", 119), candidate("d", 121)]),
    ).toEqual({ b: "similar", c: "similar" });
  });

  it("takes hashes at most 10 bits from the group's first picture as the same scene, 11 as another", () => {
    expect(reasons([candidate("a", 0), candidate("b", 1, { hash: SCENE_TEN_BITS_OFF })])).toEqual({
      b: "similar",
    });
    expect(
      reasons([candidate("a", 0), candidate("b", 1, { hash: SCENE_ELEVEN_BITS_OFF })]),
    ).toEqual({});
  });

  it("does not chain a slow pan: a picture near the one before but over 10 bits from the first starts its own group", () => {
    const result = cull([
      candidate("a", 0, { hash: PAN_START }),
      candidate("b", 10, { hash: PAN_MIDDLE }),
      candidate("c", 20, { hash: PAN_END }),
    ]);

    expect(Object.fromEntries(result.setAside)).toEqual({ b: "similar" });
    expect(result.similarGroups).toEqual([{ keptId: "a", similarIds: ["b"] }]);
  });

  it("keeps a group together across a different scene taken in between", () => {
    expect(
      reasons([
        candidate("a", 0),
        candidate("other", 30, { hash: OTHER_SCENE }),
        candidate("b", 60),
      ]),
    ).toEqual({ b: "similar" });
  });

  it("puts a picture that fits several groups into the one whose first picture is nearest in hash", () => {
    const result = cull([
      candidate("a", 0, { hash: SCENE }),
      candidate("x", 10, { hash: SCENE_ELEVEN_BITS_OFF }),
      candidate("b", 20, { hash: NEARER_ELEVEN_BITS_OFF }),
    ]);

    expect(result.similarGroups).toEqual([{ keptId: "x", similarIds: ["b"] }]);
  });

  it("puts a picture equally near two groups' first pictures into the later-started group", () => {
    const result = cull([
      candidate("a", 0, { hash: SCENE }),
      candidate("x", 10, { hash: SCENE_TWELVE_BITS_OFF }),
      candidate("b", 20, { hash: EQUALLY_NEAR }),
    ]);

    expect(result.similarGroups).toEqual([{ keptId: "x", similarIds: ["b"] }]);
  });

  it("keeps the earliest of equally sharp pictures, in capture order whatever the input order", () => {
    expect(reasons([candidate("late", 1), candidate("early", 0)])).toEqual({ late: "similar" });
  });

  it("lists the similar groups in capture order", () => {
    const result = cull([
      candidate("later-a", 1000),
      candidate("later-b", 1001),
      candidate("first-a", 0),
      candidate("first-b", 1),
    ]);

    expect(result.similarGroups.map((group) => group.keptId)).toEqual(["first-a", "later-a"]);
  });
});

describe("culling blurry pictures", () => {
  it("sets aside a picture below the floor and below a third of the median", () => {
    expect(reasons([...singles(4), candidate("soft", 0, { sharpness: BLURRY })])).toEqual({
      soft: "blurry",
    });
  });

  it("keeps a soft picture in a set shot in dim light, where it is not below a third of the median", () => {
    expect(reasons([...singles(4, 12), candidate("soft", 0, { sharpness: BLURRY })])).toEqual({});
  });

  it("keeps a picture below a third of the median that is above the floor", () => {
    expect(reasons([...singles(4, 100_000), candidate("fine", 0, { sharpness: 900 })])).toEqual({});
  });

  it("never sets aside a similar group's kept picture as blurry", () => {
    expect(
      reasons([
        ...singles(4),
        candidate("a", 0, { sharpness: BLURRY }),
        candidate("b", 1, { sharpness: BLURRY - 1 }),
      ]),
    ).toEqual({ b: "similar" });
  });

  it("keeps every picture of an import shot all equally soft", () => {
    expect(
      reasons([
        candidate("a", 0, { sharpness: BLURRY, hash: OTHER_SCENE }),
        candidate("b", 3600, { sharpness: BLURRY, hash: SCENE }),
        candidate("c", 7200, { sharpness: BLURRY, hash: OTHER_SCENE }),
      ]),
    ).toEqual({});
  });

  it("sets aside nothing of no pictures", () => {
    expect(cull([])).toEqual({ setAside: new Map(), similarGroups: [] });
  });
});
