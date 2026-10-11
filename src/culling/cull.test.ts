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

/** Pictures far apart in time, so none forms a burst: they only count for the median. */
function singles(count: number, sharpness = SHARP): CullCandidate[] {
  return Array.from({ length: count }, (_, index) =>
    candidate(`single-${index}`, 3600 * (index + 1), { sharpness, hash: OTHER_SCENE }),
  );
}

const reasons = (candidates: readonly CullCandidate[]) =>
  Object.fromEntries(cull(candidates).setAside);

describe("culling bursts", () => {
  it("keeps the sharpest of pictures taken within 2 s of the same scene, the rest are similar", () => {
    const result = cull([
      candidate("a", 0, { sharpness: 240 }),
      candidate("b", 1, { sharpness: 455 }),
      candidate("c", 2, { sharpness: 120 }),
    ]);

    expect(Object.fromEntries(result.setAside)).toEqual({ a: "similar", c: "similar" });
    expect(result.bursts).toEqual([{ keptId: "b", similarIds: ["a", "c"] }]);
  });

  it("chains a burst: each picture within 2 s of the one before", () => {
    expect(
      reasons([candidate("a", 0), candidate("b", 2), candidate("c", 4), candidate("d", 6)]),
    ).toEqual({ b: "similar", c: "similar", d: "similar" });
  });

  it("ends a burst at a gap of more than 2 s", () => {
    expect(reasons([candidate("a", 0), candidate("b", 2.5)])).toEqual({});
  });

  it("takes hashes at most 10 bits apart as the same scene, 11 apart as another", () => {
    expect(reasons([candidate("a", 0), candidate("b", 1, { hash: SCENE_TEN_BITS_OFF })])).toEqual({
      b: "similar",
    });
    expect(
      reasons([candidate("a", 0), candidate("b", 1, { hash: SCENE_ELEVEN_BITS_OFF })]),
    ).toEqual({});
  });

  it("keeps the earliest of equally sharp pictures, in capture order whatever the input order", () => {
    expect(reasons([candidate("late", 1), candidate("early", 0)])).toEqual({ late: "similar" });
  });

  it("lists the bursts in capture order", () => {
    const result = cull([
      candidate("later-a", 100),
      candidate("later-b", 101),
      candidate("first-a", 0),
      candidate("first-b", 1),
    ]);

    expect(result.bursts.map((burst) => burst.keptId)).toEqual(["first-a", "later-a"]);
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

  it("never sets aside a burst's kept picture as blurry", () => {
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
    expect(cull([])).toEqual({ setAside: new Map(), bursts: [] });
  });
});
